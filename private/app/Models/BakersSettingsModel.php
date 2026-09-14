<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\SupabaseClientInterface;
use RuntimeException;

/** `bakers_settings` — single row (id=1), which month's route adjustment (adj_may/june/july) is active. */
final class BakersSettingsModel
{
    public function __construct(private readonly SupabaseClientInterface $client)
    {
    }

    public function activeMonth(): string
    {
        $rows = $this->client->get('bakers_settings', ['id' => 'eq.1']);

        if (!isset($rows[0]['month'])) {
            throw new RuntimeException('bakers_settings row (id=1) is missing or has no month.');
        }

        return (string) $rows[0]['month'];
    }
}
