<?php

declare(strict_types=1);

namespace App\Core;

use RuntimeException;

/**
 * Thin HTTP wrapper around Supabase's REST (PostgREST) and Storage APIs.
 *
 * Two modes, both authenticated with SUPABASE_SECRET_KEY as the `apikey`
 * gateway header (this project has no separate anon/publishable key
 * configured — see private/config/env.example.php):
 *  - forUser(): Authorization is the caller's own JWT, so Postgres RLS
 *    applies as that user. Use this for anything a Model does on behalf of
 *    a logged-in caller.
 *  - forService(): Authorization is the secret key itself, which carries
 *    the `service_role` claim and bypasses RLS entirely. Reserve this for
 *    the narrow set of genuinely privileged operations (Auth Admin API,
 *    AuthMiddleware's own role lookup).
 */
final class SupabaseClient implements SupabaseClientInterface
{
    private const REST_PATH = '/rest/v1/';
    private const STORAGE_PATH = '/storage/v1/';
    private const AUTH_ADMIN_PATH = '/auth/v1/admin/';

    private function __construct(
        private readonly string $baseUrl,
        private readonly string $apiKey,
        private readonly string $authorization,
    ) {
    }

    public static function forUser(string $callerJwt): self
    {
        return new self(
            rtrim(Env::get('SUPABASE_URL'), '/'),
            Env::get('SUPABASE_SECRET_KEY'),
            "Bearer {$callerJwt}",
        );
    }

    public static function forService(): self
    {
        $secret = Env::get('SUPABASE_SECRET_KEY');

        return new self(rtrim(Env::get('SUPABASE_URL'), '/'), $secret, "Bearer {$secret}");
    }

    public function get(string $table, array $query = []): array
    {
        $url = $this->baseUrl . self::REST_PATH . $table . $this->queryString($query);

        return $this->requestJsonArray('GET', $url);
    }

    public function post(string $table, array $body): array
    {
        $url = $this->baseUrl . self::REST_PATH . $table;

        return $this->requestJsonArray('POST', $url, $body, ['Prefer: return=representation']);
    }

    public function patch(string $table, array $query, array $body): array
    {
        $url = $this->baseUrl . self::REST_PATH . $table . $this->queryString($query);

        return $this->requestJsonArray('PATCH', $url, $body, ['Prefer: return=representation']);
    }

    /**
     * Auth Admin API (`/auth/v1/admin/users`, not `/rest/v1/`) — only works
     * with the service_role key as Authorization, so callers must build
     * this client via forService(), never forUser(). `email_confirm: true`
     * skips the confirmation email since an admin is creating the account
     * directly, not the user self-registering.
     *
     * @param array<string, mixed> $userMetadata
     * @return array<string, mixed> the created Supabase Auth user, including `id`
     */
    public function createAuthUser(string $email, string $password, array $userMetadata = []): array
    {
        $url = $this->baseUrl . self::AUTH_ADMIN_PATH . 'users';

        return $this->requestJsonObject('POST', $url, [
            'email' => $email,
            'password' => $password,
            'email_confirm' => true,
            'user_metadata' => $userMetadata,
        ]);
    }

    public function uploadToStorage(string $bucket, string $objectPath, string $contents, string $contentType): void
    {
        $url = $this->baseUrl . self::STORAGE_PATH . "object/{$bucket}/{$objectPath}";

        [$status, ] = $this->rawRequest('POST', $url, $contents, [
            'Content-Type: ' . $contentType,
        ]);

        if ($status >= 400) {
            throw new RuntimeException("Supabase storage upload failed ({$status}).");
        }
    }

    public function createSignedUrl(string $bucket, string $objectPath, int $expiresInSeconds = 60): string
    {
        $url = $this->baseUrl . self::STORAGE_PATH . "object/sign/{$bucket}/{$objectPath}";

        $decoded = $this->requestJsonObject('POST', $url, ['expiresIn' => $expiresInSeconds]);

        if (!isset($decoded['signedURL']) || !is_string($decoded['signedURL'])) {
            throw new RuntimeException('Supabase did not return a signed URL.');
        }

        return $this->baseUrl . self::STORAGE_PATH . ltrim($decoded['signedURL'], '/');
    }

    /**
     * Builds the query string by hand instead of http_build_query() because
     * PostgREST expresses two constraints on the same column as a repeated
     * param (?date=gte.X&date=lte.Y), which http_build_query() cannot
     * produce from a PHP associative array (duplicate keys aren't
     * representable) — see SupabaseClientInterface::get().
     *
     * @param array<string, string|list<string>> $query
     */
    private function queryString(array $query): string
    {
        $pairs = [];

        foreach ($query as $column => $filter) {
            foreach ((array) $filter as $value) {
                $pairs[] = rawurlencode($column) . '=' . rawurlencode($value);
            }
        }

        return $pairs === [] ? '' : '?' . implode('&', $pairs);
    }

    /**
     * @param array<string, mixed>|null $body
     * @param list<string> $extraHeaders
     * @return array<int, array<string, mixed>>
     */
    private function requestJsonArray(string $method, string $url, ?array $body = null, array $extraHeaders = []): array
    {
        [$status, $decoded] = $this->jsonRequest($method, $url, $body, $extraHeaders);

        if ($status >= 400) {
            $this->throwApiError($status, $decoded);
        }

        /** @var array<int, array<string, mixed>> $decoded */
        return is_array($decoded) && array_is_list($decoded) ? $decoded : [];
    }

    /**
     * @param array<string, mixed>|null $body
     * @return array<string, mixed>
     */
    private function requestJsonObject(string $method, string $url, ?array $body = null): array
    {
        [$status, $decoded] = $this->jsonRequest($method, $url, $body);

        if ($status >= 400) {
            $this->throwApiError($status, $decoded);
        }

        /** @var array<string, mixed> $decoded */
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param array<string, mixed>|null $body
     * @param list<string> $extraHeaders
     * @return array{0: int, 1: mixed}
     */
    private function jsonRequest(string $method, string $url, ?array $body, array $extraHeaders = []): array
    {
        $payload = $body === null ? null : json_encode($body, JSON_UNESCAPED_SLASHES);

        [$status, $raw] = $this->rawRequest($method, $url, $payload, array_merge(['Content-Type: application/json'], $extraHeaders));

        $decoded = $raw === '' ? [] : json_decode($raw, true);

        return [$status, $decoded];
    }

    /** @param list<string> $extraHeaders */
    /**
     * PostgREST errors use `message`/`error`; GoTrue (Auth, including the
     * Admin API) uses `msg` or `error_description` instead — confirmed
     * 2026-08-24 against a real 422 from createAuthUser() that came back as
     * "Unknown error" until `msg` was added here. Checks all four so a
     * caller catching the RuntimeException (e.g. UserController::create())
     * actually gets Supabase's real reason to forward, not a dead end.
     */
    private function throwApiError(int $status, mixed $decoded): never
    {
        $message = is_array($decoded)
            ? ($decoded['message'] ?? $decoded['msg'] ?? $decoded['error_description'] ?? $decoded['error'] ?? 'Unknown error')
            : 'Unknown error';
        throw new RuntimeException("Supabase error ({$status}): {$message}");
    }

    /**
     * @param list<string> $extraHeaders
     * @return array{0: int, 1: string}
     */
    private function rawRequest(string $method, string $url, ?string $payload, array $extraHeaders = []): array
    {
        $ch = curl_init($url);

        if ($ch === false) {
            throw new RuntimeException('Could not initialise HTTP request.');
        }

        $headers = array_merge([
            'apikey: ' . $this->apiKey,
            'Authorization: ' . $this->authorization,
        ], $extraHeaders);

        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
        ]);

        if ($payload !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        }

        $raw = curl_exec($ch);

        if ($raw === false) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new RuntimeException("Supabase request failed: {$error}");
        }

        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return [$status, (string) $raw];
    }
}
