<?php

declare(strict_types=1);

namespace Tests\Unit\Controllers;

use App\Controllers\PasswordResetController;
use PHPUnit\Framework\TestCase;

/**
 * Exercises PasswordResetController's pure static isValidEmail(). create()
 * itself calls Response::json() (which exit()s), so it's exercised via
 * manual/Bruno testing, not a unit test — see tests/context.md on the
 * Integration/ gap. Also: create() deliberately returns the SAME response
 * whether or not the email is valid/registered, so there's no
 * "rejects invalid input with an error" behavior to unit test here in the
 * first place — that's the point (never reveal which emails exist).
 */
final class PasswordResetControllerTest extends TestCase
{
    public function test_is_valid_email_accepts_a_well_formed_address(): void
    {
        $this->assertTrue(PasswordResetController::isValidEmail('waseem@bakers.co.za'));
    }

    public function test_is_valid_email_rejects_free_text(): void
    {
        $this->assertFalse(PasswordResetController::isValidEmail('not-an-email'));
    }

    public function test_is_valid_email_rejects_empty_string(): void
    {
        $this->assertFalse(PasswordResetController::isValidEmail(''));
    }
}
