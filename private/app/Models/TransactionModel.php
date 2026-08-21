<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\SupabaseClientInterface;

/**
 * The shared `transactions` ledger (see database/migrations/context.md).
 * Every read method takes `entered_by` explicitly and filters on it — RLS
 * (migration 0004) already scopes reads/writes to the caller's own company
 * when the client runs in user mode, but the Model doesn't rely on that
 * alone: FakeSupabaseClient (unit tests) has no concept of RLS, and this
 * keeps the company boundary enforced at every layer that can express it.
 */
final class TransactionModel
{
    public function __construct(private readonly SupabaseClientInterface $client)
    {
    }

    /** @param array<string, mixed> $payload @return array<string, mixed> */
    public function create(array $payload): array
    {
        return $this->client->post('transactions', $payload)[0];
    }

    /** @return array<string, mixed>|null */
    public function findById(string $id, string $enteredBy): ?array
    {
        $rows = $this->client->get('transactions', [
            'id' => 'eq.' . $id,
            'entered_by' => 'eq.' . $enteredBy,
        ]);

        return $rows[0] ?? null;
    }

    /** @param array<string, mixed> $payload @return array<string, mixed> */
    public function patch(string $id, string $enteredBy, array $payload): array
    {
        return $this->client->patch(
            'transactions',
            ['id' => 'eq.' . $id, 'entered_by' => 'eq.' . $enteredBy],
            $payload,
        )[0];
    }

    /** @param array<string, mixed> $payload @return array<string, mixed> */
    public function insertVoid(array $payload): array
    {
        return $this->client->post('transactions', $payload)[0];
    }

    /** Is transaction $id already voided? @return array<string, mixed>|null the void row, if any */
    public function findVoidFor(string $id, string $type, string $enteredBy): ?array
    {
        $rows = $this->client->get('transactions', [
            'type' => 'eq.void',
            'voids_id' => 'eq.' . $id,
            'voids_type' => 'eq.' . $type,
            'entered_by' => 'eq.' . $enteredBy,
        ]);

        return $rows[0] ?? null;
    }

    /**
     * Originals of $type in [$from, $to] that are NOT voided. Voided rows
     * are excluded by cross-referencing against every void of this type for
     * this company (not date-scoped — a void can be entered after the
     * original's own date), the same technique already documented for the
     * frontend's own "Estado" derivation (docs/API_CONTRACT.md Section 3).
     *
     * @return list<array<string, mixed>>
     */
    public function listActiveInRange(string $type, string $enteredBy, string $from, string $to): array
    {
        $originals = $this->client->get('transactions', [
            'type' => 'eq.' . $type,
            'entered_by' => 'eq.' . $enteredBy,
            'date' => ['gte.' . $from, 'lte.' . $to],
        ]);

        $voidedIds = $this->voidedIds($type, $enteredBy);

        return array_values(array_filter(
            $originals,
            static fn (array $tx): bool => !in_array($tx['id'], $voidedIds, true),
        ));
    }

    /**
     * A void row with no `voids_id` (malformed data — buildVoidPayload()
     * always sets it) must never suppress an unrelated original from the
     * active list: filtered out explicitly rather than trusting it can
     * never be null, since `in_array(..., true)` on a null would otherwise
     * silently never match anything, not just this one broken row.
     *
     * @return list<string>
     */
    private function voidedIds(string $type, string $enteredBy): array
    {
        $voids = $this->client->get('transactions', [
            'type' => 'eq.void',
            'voids_type' => 'eq.' . $type,
            'entered_by' => 'eq.' . $enteredBy,
        ]);

        return array_values(array_filter(array_map(
            static fn (array $void): ?string => isset($void['voids_id']) ? (string) $void['voids_id'] : null,
            $voids,
        ), static fn (?string $id): bool => $id !== null));
    }
}
