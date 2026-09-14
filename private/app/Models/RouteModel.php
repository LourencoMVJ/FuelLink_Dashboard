<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\SupabaseClientInterface;

/** `routes` — Bankers logistics routes (from/to, cargo, payload, base rate + monthly adjustment). */
final class RouteModel
{
    public function __construct(private readonly SupabaseClientInterface $client)
    {
    }

    /** @return array<string, mixed>|null */
    public function find(string $id): ?array
    {
        $rows = $this->client->get('routes', ['id' => 'eq.' . $id]);

        return $rows[0] ?? null;
    }
}
