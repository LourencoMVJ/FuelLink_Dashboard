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

    /** @return array{user_id: string, role: string} */
    public function requireAuth(): array
    {
        $jwt = $this->bearerToken();

        if ($jwt === null) {
            Response::error('Missing or malformed Authorization header.', 401);
        }

        try {
            $claims = self::verify($jwt, $this->fetchJwks());
        } catch (Throwable) {
            Response::error('Invalid or expired session.', 401);
        }

        $userId = (string) ($claims['sub'] ?? '');
        $role = $userId === '' ? null : $this->lookupRole($userId);

        if ($role === null) {
            Response::error('Account has no assigned company role.', 401);
        }

        return ['user_id' => $userId, 'role' => $role];
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
     * @param array<string, mixed> $jwks
     * @return array<string, mixed>
     */
    public static function verify(string $jwt, array $jwks): array
    {
        $keys = JWK::parseKeySet($jwks, 'ES256');
        $decoded = JWT::decode($jwt, $keys);

        return (array) $decoded;
    }

    private function bearerToken(): ?string
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

    private function lookupRole(string $userId): ?string
    {
        $rows = $this->client->get('user_roles', ['user_id' => 'eq.' . $userId, 'select' => 'role']);

        $role = $rows[0]['role'] ?? null;

        return is_string($role) ? $role : null;
    }
}
