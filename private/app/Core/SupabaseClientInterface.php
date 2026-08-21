<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Contract Models depend on — never call SupabaseClient's constructor
 * directly from a Model. Two production implementations exist behind this
 * interface (SupabaseClient::forUser() / ::forService()), plus
 * FakeSupabaseClient for unit tests that must never touch the network.
 */
interface SupabaseClientInterface
{
    /**
     * @param array<string, string|list<string>> $query PostgREST-style filters,
     *     e.g. ['id' => 'eq.123'] or ['date' => ['gte.2026-08-01', 'lte.2026-08-20']]
     *     for two constraints on the same column (PostgREST ANDs repeated params).
     * @return array<int, array<string, mixed>>
     */
    public function get(string $table, array $query = []): array;

    /**
     * @param array<string, mixed> $body
     * @return array<int, array<string, mixed>>
     */
    public function post(string $table, array $body): array;

    /**
     * @param array<string, string> $query PostgREST-style filters selecting the row(s) to update.
     * @param array<string, mixed> $body
     * @return array<int, array<string, mixed>>
     */
    public function patch(string $table, array $query, array $body): array;

    public function uploadToStorage(string $bucket, string $objectPath, string $contents, string $contentType): void;

    public function createSignedUrl(string $bucket, string $objectPath, int $expiresInSeconds = 60): string;
}
