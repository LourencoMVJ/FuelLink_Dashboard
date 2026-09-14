<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\SupabaseClientInterface;

/** `drivers` — normalized Fleet table, shared reference data. See TruckModel. */
final class DriverModel
{
    public function __construct(private readonly SupabaseClientInterface $client)
    {
    }

    /** @return list<array<string, mixed>> */
    public function all(): array
    {
        return $this->client->get('drivers');
    }
}
