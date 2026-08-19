<?php

declare(strict_types=1);

namespace Tests\Unit\Core;

use App\Core\AuthMiddleware;
use App\Core\FakeSupabaseClient;
use Firebase\JWT\JWT;
use PHPUnit\Framework\TestCase;
use Throwable;

/**
 * Exercises AuthMiddleware: verify() (the pure, network-free half of JWT
 * verification, against a real EC P-256 key pair generated locally — proves
 * the ES256/JWKS verification path works without a live Supabase project),
 * and requirePermission()'s decision logic.
 *
 * requirePermission() itself calls Response::error() (which exit()s) on the
 * denied path, so it can't be exercised directly in a test process without
 * killing the runner. isGranted() exists specifically to pull that decision
 * out as a pure function — same split as verify()/requireAuth() — so only
 * the safe, always-returns "granted" path is tested through the public
 * method; the decision itself is tested directly.
 */
final class AuthMiddlewareTest extends TestCase
{
    private static string $privateKeyPem;
    private static string $x;
    private static string $y;

    public static function setUpBeforeClass(): void
    {
        $keyPair = openssl_pkey_new([
            'curve_name' => 'prime256v1',
            'private_key_type' => OPENSSL_KEYTYPE_EC,
        ]);

        if ($keyPair === false) {
            self::markTestSkipped('OpenSSL cannot generate EC key pairs in this environment.');
        }

        openssl_pkey_export($keyPair, $privatePem);
        $details = openssl_pkey_get_details($keyPair);

        self::$privateKeyPem = $privatePem;
        self::$x = self::base64UrlEncode($details['ec']['x']);
        self::$y = self::base64UrlEncode($details['ec']['y']);
    }

    public function test_verify_extracts_claims_from_a_validly_signed_token(): void
    {
        $jwt = self::signToken(['sub' => 'user-123', 'exp' => time() + 60]);

        $claims = AuthMiddleware::verify($jwt, self::jwks());

        $this->assertSame('user-123', $claims['sub']);
    }

    public function test_verify_rejects_a_token_signed_with_a_different_key(): void
    {
        $otherKeyPair = openssl_pkey_new([
            'curve_name' => 'prime256v1',
            'private_key_type' => OPENSSL_KEYTYPE_EC,
        ]);
        openssl_pkey_export($otherKeyPair, $otherPrivatePem);

        $forgedJwt = JWT::encode(['sub' => 'user-123', 'exp' => time() + 60], $otherPrivatePem, 'ES256', 'test-key');

        $this->expectException(Throwable::class);
        AuthMiddleware::verify($forgedJwt, self::jwks());
    }

    public function test_verify_rejects_an_expired_token(): void
    {
        $jwt = self::signToken(['sub' => 'user-123', 'exp' => time() - 60]);

        $this->expectException(Throwable::class);
        AuthMiddleware::verify($jwt, self::jwks());
    }

    public function test_verify_rejects_a_token_with_an_unknown_key_id(): void
    {
        $jwt = JWT::encode(['sub' => 'user-123', 'exp' => time() + 60], self::$privateKeyPem, 'ES256', 'a-different-kid');

        $this->expectException(Throwable::class);
        AuthMiddleware::verify($jwt, self::jwks());
    }

    public function test_is_granted_returns_true_when_rows_are_present(): void
    {
        $this->assertTrue(AuthMiddleware::isGranted([['permission' => 'operations.void']]));
    }

    public function test_is_granted_returns_false_when_no_rows_are_present(): void
    {
        $this->assertFalse(AuthMiddleware::isGranted([]));
    }

    /**
     * Exercises the exact PostgREST-style filter requirePermission() sends
     * (user_id + permission + granted=true) against FakeSupabaseClient,
     * seeded with rows for other users/permissions/revoked grants that must
     * NOT match. This is where a boolean-vs-string filter mismatch in the
     * fake would surface — as a normal assertion failure here, never as a
     * silent exit() inside requirePermission() itself.
     */
    public function test_fake_client_matches_only_the_exact_granted_row(): void
    {
        $client = new FakeSupabaseClient();
        $client->seed('user_permissions', [
            ['user_id' => 'user-1', 'permission' => 'operations.void', 'granted' => true],
            ['user_id' => 'user-1', 'permission' => 'operations.edit', 'granted' => false],
            ['user_id' => 'user-2', 'permission' => 'operations.void', 'granted' => true],
        ]);

        $rows = $client->get('user_permissions', [
            'user_id' => 'eq.user-1',
            'permission' => 'eq.operations.void',
            'granted' => 'eq.true',
            'select' => 'permission',
        ]);

        $this->assertCount(1, $rows);
    }

    public function test_require_permission_does_not_error_when_granted(): void
    {
        $client = new FakeSupabaseClient();
        $client->seed('user_permissions', [
            ['user_id' => 'user-1', 'permission' => 'operations.void', 'granted' => true],
        ]);

        $auth = new AuthMiddleware($client);
        $auth->requirePermission('user-1', 'operations.void');

        $this->addToAssertionCount(1); // reaching here means it did not exit()
    }

    /** @param array<string, mixed> $claims */
    private static function signToken(array $claims): string
    {
        return JWT::encode($claims, self::$privateKeyPem, 'ES256', 'test-key');
    }

    /** @return array<string, mixed> */
    private static function jwks(): array
    {
        return [
            'keys' => [[
                'kty' => 'EC',
                'crv' => 'P-256',
                'alg' => 'ES256',
                'use' => 'sig',
                'kid' => 'test-key',
                'x' => self::$x,
                'y' => self::$y,
            ]],
        ];
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
