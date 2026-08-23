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
}
