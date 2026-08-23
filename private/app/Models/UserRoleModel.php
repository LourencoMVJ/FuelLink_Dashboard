<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\SupabaseClientInterface;

/**
 * `user_roles` — one row per Supabase Auth user, extended by migration 0004
 * with `is_admin`/`full_name`/`phone`/`is_active`/`created_by`/`created_at`.
 * Always written via a service-mode client (UserController) — never exposed
 * to a user-mode client, since only admins may create/modify these rows.
 */
final class UserRoleModel
{
    public function __construct(private readonly SupabaseClientInterface $client)
    {
    }

    /** @param array<string, mixed> $payload @return array<string, mixed> */
    public function create(array $payload): array
    {
        return $this->client->post('user_roles', $payload)[0];
    }
}
