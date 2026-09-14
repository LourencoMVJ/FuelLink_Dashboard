<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\SupabaseClientInterface;

/**
 * `trucks` — the normalized Fleet table, shared reference data across both
 * companies (not scoped by entered_by). An operation's truck can point here
 * via truck_id, or fall back to free-text truck_text when it isn't in the
 * Fleet yet (migration 0002) — see App\Controllers\OperationController::resolveTruck().
 */
final class TruckModel
{
    public function __construct(private readonly SupabaseClientInterface $client)
    {
    }

    /** @return list<array<string, mixed>> */
    public function all(): array
    {
        return $this->client->get('trucks');
    }
}
