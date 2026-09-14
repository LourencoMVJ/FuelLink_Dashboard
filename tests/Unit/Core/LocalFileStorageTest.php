<?php

declare(strict_types=1);

namespace Tests\Unit\Core;

use App\Core\LocalFileStorage;
use PHPUnit\Framework\TestCase;

/**
 * Exercises real filesystem I/O under private/storage/proofs/ (already
 * git-ignored) — safe and fast, unlike a Supabase-backed test, since it
 * never leaves the local machine. Every test cleans up the file it wrote.
 */
final class LocalFileStorageTest extends TestCase
{
    /** @var list<string> */
    private array $writtenPaths = [];

    protected function tearDown(): void
    {
        foreach ($this->writtenPaths as $objectPath) {
            $full = dirname(__DIR__, 3) . '/private/storage/proofs/' . $objectPath;

            if (is_file($full)) {
                unlink($full);
            }
        }

        $this->writtenPaths = [];
    }

    public function test_store_then_resolved_path_if_exists_round_trips(): void
    {
        $objectPath = 'test-' . bin2hex(random_bytes(6)) . '.txt';
        $this->writtenPaths[] = $objectPath;

        LocalFileStorage::store($objectPath, 'hello world');
        $path = LocalFileStorage::resolvedPathIfExists($objectPath);

        $this->assertNotNull($path);
        $this->assertSame('hello world', file_get_contents($path));
    }

    public function test_resolved_path_if_exists_returns_null_for_a_missing_file(): void
    {
        $this->assertNull(LocalFileStorage::resolvedPathIfExists('does-not-exist-' . bin2hex(random_bytes(6)) . '.txt'));
    }

    public function test_store_creates_the_proofs_directory_if_missing(): void
    {
        // Doesn't assert on the directory directly (it may already exist
        // from other tests/uploads) — just confirms store() doesn't throw
        // when writing a fresh file, which requires the directory to
        // exist or be created.
        $objectPath = 'nested-check-' . bin2hex(random_bytes(6)) . '.txt';
        $this->writtenPaths[] = $objectPath;

        LocalFileStorage::store($objectPath, 'x');

        $this->assertNotNull(LocalFileStorage::resolvedPathIfExists($objectPath));
    }
}
