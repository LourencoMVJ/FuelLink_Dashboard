<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\SupabaseClientInterface;
use RuntimeException;

/** `fuellink_settings` — single row (id=1), the global diesel price Fuellink sells at. */
final class FuellinkSettingsModel
{
    public function __construct(private readonly SupabaseClientInterface $client)
    {
    }

    public function dieselPrice(): float
    {
        $rows = $this->client->get('fuellink_settings', ['id' => 'eq.1']);

        if (!isset($rows[0]['diesel_price'])) {
            throw new RuntimeException('fuellink_settings row (id=1) is missing or has no diesel_price.');
        }

        return (float) $rows[0]['diesel_price'];
    }
}
