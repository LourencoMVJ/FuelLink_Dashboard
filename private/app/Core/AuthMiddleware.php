<?php

declare(strict_types=1);

namespace App\Core;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use RuntimeException;
use Throwable;

/**
 * Verifies the caller's Supabase JWT (asymmetric JWKS, ES256 — confirmed
 * 2026-08-11, no shared HS256 secret) and resolves their app-level company
 * role from user_roles.
 *
 * verify() is a pure function (no network, no I/O) deliberately kept
 * separate from requireAuth() so JWT verification itself can be unit
 * tested with a locally generated key pair — see
 * tests/Unit/Core/AuthMiddlewareTest.php.
 */
final class AuthMiddleware
{
    private const JWKS_CACHE_TTL_SECONDS = 3600;

    public function __construct(private readonly SupabaseClientInterface $client)
    {
    }

    /**
     * @return array{user_id: string, email: string, role: string,
     *     is_admin: bool, full_name: string|null, phone: string|null}
     */
    public function requireAuth(): array
    {
        $jwt = self::bearerToken();

        if ($jwt === null) {
            Response::error('Missing or malformed Authorization header.', 401);
        }

        try {
            $claims = self::verify($jwt, $this->fetchJwks());
        } catch (Throwable) {
            Response::error('Invalid or expired session.', 401);
        }

        $userId = (string) ($claims['sub'] ?? '');
        $email = (string) ($claims['email'] ?? '');
        $profile = $userId === '' ? null : $this->lookupProfile($userId);

        if ($profile === null) {
            // Covers both "no user_roles row" and "is_active = false" — the
            // query itself filters on is_active, so a deactivated account
            // gets exactly the same response as one that was never assigned
            // a role. Never reveal which case it was.
            Response::error('Account has no assigned company role, or is inactive.', 401);
        }

        return self::buildProfile($userId, $email, $profile);
    }

    /** @return list<string> */
    public function listPermissions(string $userId): array
    {
        $rows = $this->client->get('user_permissions', [
            'user_id' => 'eq.' . $userId,
            'granted' => 'eq.true',
            'select' => 'permission',
        ]);

        return self::extractPermissionCodes($rows);
    }

    public function requirePermission(string $userId, string $permission): void
    {
        $rows = $this->client->get('user_permissions', [
            'user_id' => 'eq.' . $userId,
            'permission' => 'eq.' . $permission,
            'granted' => 'eq.true',
            'select' => 'permission',
        ]);

        if (!self::isGranted($rows)) {
            Response::error('You do not have permission to perform this action.', 403);
        }
    }

    /**
     * Pure decision: does this row set (already filtered to the exact
     * user_id + permission + granted=true by the query above) grant access?
     * Split out from requirePermission() so the decision is unit-testable
     * without going anywhere near Response::error()'s exit() — same reason
     * verify() is split from requireAuth().
     *
     * @param array<int, array<string, mixed>> $rows
     */
    public static function isGranted(array $rows): bool
    {
        return $rows !== [];
    }

    /**
     * Pure shaping: turns one already-fetched user_roles row into the
     * profile shape requireAuth()/GET /api/me return. Split out so the
     * defaulting of optional fields (a brand-new user may have no
     * full_name/phone yet) is unit-testable without a real HTTP request.
     *
     * @param array<string, mixed> $row
     * @return array{user_id: string, email: string, role: string,
     *     is_admin: bool, full_name: string|null, phone: string|null}
     */
    public static function buildProfile(string $userId, string $email, array $row): array
    {
        return [
            'user_id' => $userId,
            'email' => $email,
            'role' => (string) ($row['role'] ?? ''),
            'is_admin' => (bool) ($row['is_admin'] ?? false),
            'full_name' => isset($row['full_name']) ? (string) $row['full_name'] : null,
            'phone' => isset($row['phone']) ? (string) $row['phone'] : null,
        ];
    }

    /**
     * Pure shaping: user_permissions rows -> the flat list of granted
     * permission codes GET /api/me and role-aware frontend code consume.
     *
     * @param array<int, array<string, mixed>> $rows
     * @return list<string>
     */
    public static function extractPermissionCodes(array $rows): array
    {
        return array_values(array_map(
            static fn (array $row): string => (string) $row['permission'],
            $rows,
        ));
    }

    /**
     * @param array<string, mixed> $jwks
     * @return array<string, mixed>
     */
    public static function verify(string $jwt, array $jwks): array
    {
        $keys = JWK::parseKeySet($jwks, 'ES256');
        $decoded = JWT::decode($jwt, $keys);

        return (array) $decoded;
    }

    /**
     * Public + static (reads only $_SERVER, no instance state) so Router can
     * pull the caller's raw JWT to build SupabaseClient::forUser() for
     * Controllers whose Models must run under the caller's own RLS —
     * AuthMiddleware itself always runs in service mode (see
     * Router::build()) and never needs this for its own lookups.
     */
    public static function bearerToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

        return str_starts_with($header, 'Bearer ') ? substr($header, 7) : null;
    }

    /** @return array<string, mixed> */
    private function fetchJwks(): array
    {
        $cachePath = dirname(__DIR__, 2) . '/storage/jwks-cache.json';

        return $this->readJwksCache($cachePath) ?? $this->refreshJwksCache($cachePath);
    }

    /** @return array<string, mixed>|null */
    private function readJwksCache(string $path): ?array
    {
        if (!is_file($path) || (time() - filemtime($path)) > self::JWKS_CACHE_TTL_SECONDS) {
            return null;
        }

        $contents = file_get_contents($path);
        $decoded = $contents === false ? null : json_decode($contents, true);

        return is_array($decoded) ? $decoded : null;
    }

    /** @return array<string, mixed> */
    private function refreshJwksCache(string $path): array
    {
        $jwks = $this->downloadJwks();
        file_put_contents($path, json_encode($jwks));

        return $jwks;
    }

    /** @return array<string, mixed> */
    private function downloadJwks(): array
    {
        $url = rtrim(Env::get('SUPABASE_URL'), '/') . '/auth/v1/.well-known/jwks.json';

        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('Could not initialise JWKS request.');
        }

        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
        $raw = curl_exec($ch);
        curl_close($ch);

        $decoded = is_string($raw) ? json_decode($raw, true) : null;

        if (!is_array($decoded) || !isset($decoded['keys'])) {
            throw new RuntimeException('Could not fetch Supabase JWKS.');
        }

        return $decoded;
    }

    /**
     * Filters on is_active here (not just relying on RLS) because this
     * client is always in service mode (see Router::build()) — it bypasses
     * RLS entirely, so a deactivated account must be excluded explicitly or
     * PHP-mediated endpoints would keep working for them even though direct
     * Supabase reads (gated by current_user_role(), migration 0004) would
     * already deny them.
     *
     * @return array<string, mixed>|null
     */
    private function lookupProfile(string $userId): ?array
    {
        $rows = $this->client->get('user_roles', [
            'user_id' => 'eq.' . $userId,
            'is_active' => 'eq.true',
            'select' => 'role,is_admin,full_name,phone',
        ]);

        return $rows[0] ?? null;
    }
}
