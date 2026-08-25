<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\SupabaseClientInterface;

/**
 * `password_reset_requests` — a pending admin-reviewed credential-reset
 * request (migration 0006). Not a self-service flow: the account holder
 * cannot reset their own password through this table; an admin reviews it
 * manually (directly via Supabase — RLS scopes SELECT to admins) until an
 * email notification step is built. Always written via a service-mode
 * client, same as UserRoleModel.
 */
final class PasswordResetRequestModel
{
    public function __construct(private readonly SupabaseClientInterface $client)
    {
    }

    /** @return array<string, mixed> */
    public function create(string $email): array
    {
        return $this->client->post('password_reset_requests', [
            'email' => $email,
            'status' => 'pending',
        ])[0];
    }

    /**
     * Lightweight spam mitigation for this endpoint's one unauthenticated
     * write path — no rate-limiting infrastructure exists anywhere in this
     * app (a known, accepted gap for a 2-3 person internal tool), so this
     * doesn't stop many-different-emails flooding, only repeat submissions
     * for the SAME email piling up in the admin's review queue.
     */
    public function hasPendingRequestSince(string $email, string $since): bool
    {
        $rows = $this->client->get('password_reset_requests', [
            'email' => 'eq.' . $email,
            'status' => 'eq.pending',
            'requested_at' => 'gte.' . $since,
        ]);

        return $rows !== [];
    }
}
