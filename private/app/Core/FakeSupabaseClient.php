<?php

declare(strict_types=1);

namespace App\Core;

/**
 * In-memory double for unit tests — Models/AuthMiddleware are injected with
 * this instead of the real SupabaseClient so tests never touch production
 * (or any) Supabase project. Supports the same PostgREST-style `eq.value`
 * filters the real client's callers use.
 */
final class FakeSupabaseClient implements SupabaseClientInterface
{
    /** @var array<string, array<int, array<string, mixed>>> */
    private array $tables = [];

    /** @var array<string, string> */
    private array $storage = [];

    /** @param array<int, array<string, mixed>> $rows */
    public function seed(string $table, array $rows): void
    {
        $this->tables[$table] = $rows;
    }

    public function get(string $table, array $query = []): array
    {
        return array_values(array_filter(
            $this->tables[$table] ?? [],
            fn (array $row) => $this->rowMatches($row, $query),
        ));
    }

    public function post(string $table, array $body): array
    {
        $this->tables[$table][] = $body;

        return [$body];
    }

    public function patch(string $table, array $query, array $body): array
    {
        $updated = [];

        foreach ($this->tables[$table] ?? [] as $i => $row) {
            if (!$this->rowMatches($row, $query)) {
                continue;
            }

            $this->tables[$table][$i] = array_merge($row, $body);
            $updated[] = $this->tables[$table][$i];
        }

        return $updated;
    }

    public function uploadToStorage(string $bucket, string $objectPath, string $contents, string $contentType): void
    {
        $this->storage["{$bucket}/{$objectPath}"] = $contents;
    }

    public function createSignedUrl(string $bucket, string $objectPath, int $expiresInSeconds = 60): string
    {
        return "https://fake.supabase.local/storage/v1/object/sign/{$bucket}/{$objectPath}?expires={$expiresInSeconds}";
    }

    /** @param array<string, mixed> $row @param array<string, string> $query */
    private function rowMatches(array $row, array $query): bool
    {
        foreach ($query as $column => $filter) {
            if ($column === 'select' || $column === 'order' || $column === 'limit') {
                continue;
            }

            $expected = str_starts_with($filter, 'eq.') ? substr($filter, 3) : $filter;

            if ($this->stringify($row[$column] ?? null) !== $expected) {
                return false;
            }
        }

        return true;
    }

    /**
     * PHP casts `true`/`false` to "1"/"" via (string), not "true"/"false" —
     * so seeding a row with a real bool `granted: true` would silently fail
     * to match a `granted => 'eq.true'` filter, the same shape PostgREST
     * itself matches correctly over HTTP. Normalize booleans explicitly so
     * this fake actually behaves like the real filter it stands in for.
     */
    private function stringify(mixed $value): string
    {
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        return (string) $value;
    }
}
