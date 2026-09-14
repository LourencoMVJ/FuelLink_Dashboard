<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\AuthMiddleware;
use App\Core\Response;

/**
 * GET /api/me — the first call the frontend makes after signing in directly
 * with Supabase Auth (login itself is never a PHP endpoint, see
 * docs/API_CONTRACT.md). Returns the app-level profile plus the caller's
 * granted permission codes, so the frontend can render role-aware without a
 * second round-trip.
 */
final class MeController
{
    public function __construct(private readonly AuthMiddleware $auth)
    {
    }

    public function get(): void
    {
        $caller = $this->auth->requireAuth();
        $permissions = $this->auth->listPermissions($caller['user_id']);

        Response::json([...$caller, 'permissions' => $permissions]);
    }
}
