<?php

declare(strict_types=1);

namespace App\Core;

use RuntimeException;

/**
 * Stores proof uploads on the cPanel filesystem, under
 * `private/storage/proofs/` — NOT Supabase Storage (decided 2026-08-27,
 * user request: Supabase Storage's per-GB pricing gets expensive at scale;
 * the contract already runs this backend self-hosted on cPanel with "sem
 * infra nova", Clause 6.2, and `private/storage/` already exists outside
 * `public_html/`, so it's never directly web-reachable — the only way to
 * read a file back is through an authenticated Controller, same access
 * control model Supabase's signed URLs gave us before).
 *
 * `$objectPath` must already be safe (no `/`, no `..`) before it reaches
 * here — `OperationController::sanitizeFilename()` is what guarantees
 * that; this class does not sanitize on its own, so never pass raw
 * client-supplied input to it directly.
 */
final class LocalFileStorage
{
    private const SUBDIRECTORY = 'proofs';

    public static function store(string $objectPath, string $contents): void
    {
        $fullPath = self::resolvePath($objectPath);
        $dir = dirname($fullPath);

        if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
            throw new RuntimeException("Could not create storage directory: {$dir}");
        }

        if (file_put_contents($fullPath, $contents) === false) {
            throw new RuntimeException("Could not write file: {$objectPath}");
        }
    }

    /**
     * The resolved absolute path, only if the file actually exists —
     * exists so a caller can re-sniff the real MIME type at serve time
     * (`FileValidator::sniffMimeType()` needs a path, not raw bytes).
     * Never expose this to a response; it's a server-local filesystem
     * path, not anything a client should see.
     */
    public static function resolvedPathIfExists(string $objectPath): ?string
    {
        $fullPath = self::resolvePath($objectPath);

        return is_file($fullPath) ? $fullPath : null;
    }

    private static function resolvePath(string $objectPath): string
    {
        return dirname(__DIR__, 2) . '/storage/' . self::SUBDIRECTORY . '/' . $objectPath;
    }
}
