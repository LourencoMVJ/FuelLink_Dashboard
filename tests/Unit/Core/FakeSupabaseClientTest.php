<?php

declare(strict_types=1);

namespace Tests\Unit\Core;

use App\Core\FakeSupabaseClient;
use PHPUnit\Framework\TestCase;
use RuntimeException;

/**
 * Exercises FakeSupabaseClient::createAuthUser() — the double for
 * SupabaseClient's Auth Admin API wrapper, added for UserController::create()
 * (2026-08-23). Its duplicate-email rejection is what lets
 * UserController's "email already registered" error path be tested without
 * hitting a real Supabase project.
 */
final class FakeSupabaseClientTest extends TestCase
{
    public function test_create_auth_user_returns_an_id_and_the_given_email(): void
    {
        $client = new FakeSupabaseClient();

        $user = $client->createAuthUser('new@bakers.co.za', 'a-real-password', ['role' => 'bakers']);

        $this->assertSame('new@bakers.co.za', $user['email']);
        $this->assertNotEmpty($user['id']);
    }

    public function test_create_auth_user_rejects_a_duplicate_email(): void
    {
        $client = new FakeSupabaseClient();
        $client->createAuthUser('taken@bakers.co.za', 'password-one');

        $this->expectException(RuntimeException::class);
        $client->createAuthUser('taken@bakers.co.za', 'password-two');
    }

    public function test_create_auth_user_assigns_distinct_ids_to_distinct_users(): void
    {
        $client = new FakeSupabaseClient();

        $first = $client->createAuthUser('a@bakers.co.za', 'password-one');
        $second = $client->createAuthUser('b@bakers.co.za', 'password-two');

        $this->assertNotSame($first['id'], $second['id']);
    }
}
