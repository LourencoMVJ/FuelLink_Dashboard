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
 * `is_admin` IS accepted from the request (reversed 2026-08-24 — briefly
 * hardcoded to `false` after a security review flagged that any admin
 * could mint further admins with no additional check). Reinstated at the
 * user's explicit request: with only 2-3 trusted accounts total, requiring
 * manual SQL to promote someone was worse than the (accepted) risk. If
 * this system ever grows past a small trusted team, revisit — e.g. a
 * separate "can grant admin" tier, or an approval step.
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
        $isAdmin = (bool) $request->input('is_admin', false);

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

        $profile = $this->userRoles->create([
            'user_id' => $userId,
            'role' => $role,
            'is_admin' => $isAdmin,
            'full_name' => $fullName,
            'phone' => $phone,
            'is_active' => true,
            'created_by' => $caller['user_id'],
        ]);

        Response::json([
            'user_id' => $userId,
            'email' => $email,
            'role' => $profile['role'] ?? $role,
            'is_admin' => (bool) ($profile['is_admin'] ?? $isAdmin),
            'full_name' => $profile['full_name'] ?? $fullName,
            'phone' => $profile['phone'] ?? $phone,
        ], 201);
    }

    /**
     * PATCH /api/users/{id} — admin-only, partial update. Only the columns
     * migration 0004 actually granted UPDATE on for user_roles:
     * full_name/phone/is_active/is_admin. Deliberately excludes `role`
     * (which company an account belongs to shouldn't change post-creation —
     * that's a bigger structural move, not a profile edit) and
     * email/password (Supabase Auth account properties, not user_roles —
     * would need a separate Admin API call, not built here since it wasn't
     * asked for).
     */
    public function update(string $id): void
    {
        $caller = $this->auth->requireAuth();

        if (!$caller['is_admin']) {
            Response::error('Only admins can update users.', 403);
        }

        $request = Request::capture();
        $payload = self::buildUpdatePayload($request->all());

        if ($payload === []) {
            Response::error(
                'Nothing to update — send at least one of full_name, phone, is_active, is_admin.',
                400,
            );
        }

        $profile = $this->userRoles->patch($id, $payload);

        if ($profile === null) {
            Response::error('User not found.', 404);
        }

        Response::json([
            'user_id' => $id,
            'role' => $profile['role'] ?? null,
            'is_admin' => (bool) ($profile['is_admin'] ?? false),
            'is_active' => (bool) ($profile['is_active'] ?? true),
            'full_name' => $profile['full_name'] ?? null,
            'phone' => $profile['phone'] ?? null,
        ]);
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

    /**
     * Builds the user_roles PATCH payload from the raw request body —
     * `array_key_exists()`, not `isset()`, so an explicit `"full_name": null`
     * (clear the name) is honored the same as an explicit string, while a
     * genuinely omitted key leaves that column untouched. Only the 4
     * columns migration 0004 granted UPDATE on are ever included; anything
     * else in the body (role, email, ...) is silently ignored, not an error
     * — matches how PATCH endpoints elsewhere in this app treat unknown
     * fields (see OperationController::edit()).
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public static function buildUpdatePayload(array $input): array
    {
        $payload = [];

        if (array_key_exists('full_name', $input)) {
            $payload['full_name'] = self::nullableTrim($input['full_name']);
        }

        if (array_key_exists('phone', $input)) {
            $payload['phone'] = self::nullableTrim($input['phone']);
        }

        if (array_key_exists('is_active', $input)) {
            $payload['is_active'] = (bool) $input['is_active'];
        }

        if (array_key_exists('is_admin', $input)) {
            $payload['is_admin'] = (bool) $input['is_admin'];
        }

        return $payload;
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
