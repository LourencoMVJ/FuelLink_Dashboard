<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\AuthMiddleware;
use App\Core\Response;
use App\Models\TransactionModel;

/**
 * GET /api/ledger — Net Position / Ledger de Compensação. The privileged
 * replacement for what the Antigo dashboard's shared Ledger view actually
 * ran on: a forgotten, pre-0001 permissive RLS policy
 * ("transactions readable") that let any authenticated user read every
 * company's transactions directly via Supabase — found and left
 * deliberately un-dropped 2026-08-27 (see database/migrations/context.md)
 * specifically until this endpoint existed to replace it. Once this ships
 * and the Antigo dashboard (or its replacement) is pointed at it, that
 * policy can be dropped.
 *
 * Admin-gated directly on `is_admin`, not a permission code — same
 * reasoning as `UserController`: only the 2 Admin accounts ever used the
 * old Ledger view, and there's no finer-grained need yet despite
 * `ledger.view` existing in the permission catalog on paper
 * (docs/ROADMAP_FRONTEND.md Section 6).
 */
final class LedgerController
{
    public function __construct(
        private readonly AuthMiddleware $auth,
        private readonly TransactionModel $transactions,
    ) {
    }

    public function index(): void
    {
        $caller = $this->auth->requireAuth();

        if (!$caller['is_admin']) {
            Response::error('Only admins can view the ledger.', 403);
        }

        Response::json(self::buildLedger($this->transactions->listAll()));
    }

    /**
     * Pure — no I/O, no Response::error() — sorts chronologically
     * (date, then created_at as a same-day tiebreaker), accumulates a
     * running balance across BOTH companies combined (that running number
     * IS the net position — inherently cross-company, unlike the row
     * lists themselves), then splits the rows into per-company lists for
     * display. Includes void rows same as every other type — a void's own
     * `balance_delta` is what makes it net out against the original in the
     * running balance; excluding it would double-count instead.
     *
     * @param list<array<string, mixed>> $rows
     * @return array{fuellink: list<array<string, mixed>>, bakers: list<array<string, mixed>>, net_balance: float}
     */
    public static function buildLedger(array $rows): array
    {
        usort($rows, static function (array $a, array $b): int {
            return [(string) ($a['date'] ?? ''), (string) ($a['created_at'] ?? '')]
                <=> [(string) ($b['date'] ?? ''), (string) ($b['created_at'] ?? '')];
        });

        $running = 0.0;
        $fuellink = [];
        $bakers = [];

        foreach ($rows as $row) {
            $running += (float) ($row['balance_delta'] ?? 0);
            $entry = [...$row, 'running_balance' => $running];

            if (($row['entered_by'] ?? null) === 'fuellink') {
                $fuellink[] = $entry;
            } elseif (($row['entered_by'] ?? null) === 'bakers') {
                $bakers[] = $entry;
            }
        }

        return ['fuellink' => $fuellink, 'bakers' => $bakers, 'net_balance' => $running];
    }
}
