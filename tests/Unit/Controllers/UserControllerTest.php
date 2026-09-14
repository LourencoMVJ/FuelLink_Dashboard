<?php

declare(strict_types=1);

namespace Tests\Unit\Controllers;

use App\Controllers\UserController;
use PHPUnit\Framework\TestCase;

/**
 * Exercises UserController's pure static validators — same
 * split-for-testability pattern as AuthMiddleware/OperationController.
 * create() itself calls Response::error()/Response::json() (both exit()),
 * so it's exercised via manual/Bruno testing, not a unit test — see
 * tests/context.md on the Integration/ gap.
 */
final class UserControllerTest extends TestCase
{
    public function test_is_valid_email_accepts_a_well_formed_address(): void
    {
        $this->assertTrue(UserController::isValidEmail('waseem@bakers.co.za'));
    }

    public function test_is_valid_email_rejects_free_text(): void
    {
        $this->assertFalse(UserController::isValidEmail('not-an-email'));
    }

    public function test_is_valid_email_rejects_empty_string(): void
    {
        $this->assertFalse(UserController::isValidEmail(''));
    }

    public function test_is_valid_role_accepts_fuellink(): void
    {
        $this->assertTrue(UserController::isValidRole('fuellink'));
    }

    public function test_is_valid_role_accepts_bakers(): void
    {
        $this->assertTrue(UserController::isValidRole('bakers'));
    }

    public function test_is_valid_role_rejects_anything_else(): void
    {
        $this->assertFalse(UserController::isValidRole('admin'));
        $this->assertFalse(UserController::isValidRole(''));
        $this->assertFalse(UserController::isValidRole('Fuellink'));
    }

    // ---------- buildUpdatePayload ----------

    public function test_build_update_payload_includes_only_the_fields_present_in_the_body(): void
    {
        $payload = UserController::buildUpdatePayload(['full_name' => 'Waseem K.']);

        $this->assertSame(['full_name' => 'Waseem K.'], $payload);
    }

    public function test_build_update_payload_is_empty_when_body_has_no_updatable_fields(): void
    {
        $this->assertSame([], UserController::buildUpdatePayload(['role' => 'fuellink']));
    }

    public function test_build_update_payload_ignores_role_email_and_password(): void
    {
        $payload = UserController::buildUpdatePayload([
            'role' => 'fuellink',
            'email' => 'new@example.com',
            'password' => 'whatever',
            'phone' => '+27123456789',
        ]);

        $this->assertSame(['phone' => '+27123456789'], $payload);
    }

    public function test_build_update_payload_honors_an_explicit_null_full_name_as_clearing_it(): void
    {
        $payload = UserController::buildUpdatePayload(['full_name' => null]);

        $this->assertArrayHasKey('full_name', $payload);
        $this->assertNull($payload['full_name']);
    }

    public function test_build_update_payload_casts_is_active_and_is_admin_to_bool(): void
    {
        $payload = UserController::buildUpdatePayload(['is_active' => false, 'is_admin' => true]);

        $this->assertSame(['is_active' => false, 'is_admin' => true], $payload);
    }

    public function test_build_update_payload_includes_all_four_fields_when_all_are_present(): void
    {
        $payload = UserController::buildUpdatePayload([
            'full_name' => 'New Name',
            'phone' => '123',
            'is_active' => true,
            'is_admin' => false,
        ]);

        $this->assertSame([
            'full_name' => 'New Name',
            'phone' => '123',
            'is_active' => true,
            'is_admin' => false,
        ], $payload);
    }
}
