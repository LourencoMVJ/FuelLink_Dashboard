<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\AuthMiddleware;
use App\Core\Request;
use App\Core\Response;
use App\Core\SupabaseClientInterface;
use App\Models\UserRoleModel;
use RuntimeException;

/**
 * POST /api/users — admin-only account creation, meant to back a separate
 * "create user" form ahead of putting the dashboard in front of real users
 * (2026-08-23). Scoped to exactly that: list/update/deactivate (Month 1's
 * other planned UserController methods) aren't built here — add them when
 * actually needed, see docs/ROADMAP_BACKEND.md Section 3, Month 1.
 *
 * Gated on `is_admin` directly, not a permission code — user management
 * itself has no finer-grained permission in the catalog
 * (docs/ROADMAP_FRONTEND.md Section 6 only defines operations, ledger, and
 * documents permission codes), and the roadmap's own route map lists this
 * as admin-gated, not permission-gated.
 *
 * Every account created here starts as a regular (non-admin) user — a
 * security review (2026-08-23) flagged that accepting `is_admin` from the
 * request would let any admin mint further admins with no additional
 * check; promoting to admin is a manual SQL step until this needs a real
 * UI. See database/migrations/context.md if that decision changes.
 */
final class UserController
{
    public function __construct(
        private readonly AuthMiddleware $auth,
        private readonly SupabaseClientInterface $authAdmin,
        private readonly UserRoleModel $userRoles,
    ) {
    }

    public function create(): void
    {
        $caller = $this->auth->requireAuth();

        if (!$caller['is_admin']) {
            Response::error('Only admins can create users.', 403);
        }

        $request = Request::capture();

        $email = trim((string) $request->input('email', ''));
        if (!self::isValidEmail($email)) {
            Response::error('Enter a valid email address.', 400);
        }

        $password = (string) $request->input('password', '');
        if (mb_strlen($password) < 8) {
            Response::error('Password must be at least 8 characters.', 400);
        }

        $role = (string) $request->input('role', '');
        if (!self::isValidRole($role)) {
            Response::error("Role must be 'fuellink' or 'bakers'.", 400);
        }

        $fullName = self::nullableTrim($request->input('full_name'));
        $phone = self::nullableTrim($request->input('phone'));

        try {
            $authUser = $this->authAdmin->createAuthUser($email, $password, ['role' => $role]);
        } catch (RuntimeException $e) {
            // Supabase Admin API error messages (e.g. "email already
            // registered", "password too short") are written for exactly
            // this kind of admin-facing form — safe to forward, unlike a
            // generic internal error.
            Response::error('Could not create the account: ' . $e->getMessage(), 400);
        }

        $userId = (string) ($authUser['id'] ?? '');
        if ($userId === '') {
            Response::error('Supabase did not return a user id for the new account.', 500);
        }

        // is_admin is never taken from the request — every account created
        // through this endpoint starts as a regular user (decided
        // 2026-08-23, after a security review flagged that an admin could
        // otherwise mint further admins with no additional check).
        // Promoting to admin is a manual SQL step until a PATCH
        // /api/users/{id} exists.
        $profile = $this->userRoles->create([
            'user_id' => $userId,
            'role' => $role,
            'is_admin' => false,
            'full_name' => $fullName,
            'phone' => $phone,
            'is_active' => true,
            'created_by' => $caller['user_id'],
        ]);

        Response::json([
            'user_id' => $userId,
            'email' => $email,
            'role' => $profile['role'] ?? $role,
            'is_admin' => (bool) ($profile['is_admin'] ?? false),
            'full_name' => $profile['full_name'] ?? $fullName,
            'phone' => $profile['phone'] ?? $phone,
        ], 201);
    }

    // ------------------------------------------------------------------
    // Pure, static validators — no I/O, no Response::error() — testable
    // directly, see tests/Unit/Controllers/UserControllerTest.php.
    // ------------------------------------------------------------------

    public static function isValidEmail(string $email): bool
    {
        return $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    /** Only these 2 companies exist in this system — see AuthMiddleware/OperationController. */
    public static function isValidRole(string $role): bool
    {
        return in_array($role, ['fuellink', 'bakers'], true);
    }

    private static function nullableTrim(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
