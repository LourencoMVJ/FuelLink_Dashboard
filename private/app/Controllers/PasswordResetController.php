<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Models\PasswordResetRequestModel;
use DateTimeImmutable;
use DateTimeInterface;
use RuntimeException;

/**
 * POST /api/forgot-password — the one unauthenticated write endpoint in
 * this API (the whole point: the caller can't log in). Deliberately NOT
 * self-service Supabase Auth reset (overrides the 16/08/2026 decision in
 * docs/API_CONTRACT.md Section 1, at the user's explicit request
 * 2026-08-24): logs a pending request for an admin to review and action
 * manually instead of emailing the account holder directly — "desta forma
 * sempre haverá conhecimento sobre quem tenta aceder à conta."
 *
 * No email server is configured yet — this only persists the request
 * (migration 0006); notifying admins is a stub until that's built. See
 * database/migrations/context.md.
 *
 * The response is identical whether or not the email is well-formed or
 * matches a real account — never reveals which emails are registered.
 */
final class PasswordResetController
{
    public function __construct(private readonly PasswordResetRequestModel $requests)
    {
    }

    private const COOLDOWN = '-1 hour';

    public function create(): void
    {
        $request = Request::capture();
        $email = trim((string) $request->input('email', ''));

        if (self::isValidEmail($email)) {
            try {
                $this->recordRequestIfNotRecentlyDuplicated($email);
            } catch (RuntimeException) {
                // A failed lookup/insert must never surface as anything
                // other than the same 202 below — the response is not
                // allowed to leak database state either way.
            }
        }

        Response::json(
            ['message' => 'If this account exists, an administrator has been notified.'],
            202,
        );
    }

    /**
     * Lightweight spam mitigation (see PasswordResetRequestModel) — skips
     * creating a new row (and the future admin notification) if this email
     * already has a pending request within the cooldown window, without
     * changing what the caller sees either way.
     */
    private function recordRequestIfNotRecentlyDuplicated(string $email): void
    {
        $since = (new DateTimeImmutable(self::COOLDOWN))->format(DateTimeInterface::ATOM);

        if ($this->requests->hasPendingRequestSince($email, $since)) {
            return;
        }

        $this->requests->create($email);
        self::notifyAdmins($email);
    }

    public static function isValidEmail(string $email): bool
    {
        return $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * TODO(email server, not configured yet): send the actual admin
     * notification here once an SMTP/mail provider is wired up — see
     * database/migrations/context.md migration 0006. Until then, an admin
     * reviews `password_reset_requests` directly via Supabase (RLS already
     * scopes SELECT to admins).
     */
    private static function notifyAdmins(string $email): void
    {
    }
}
