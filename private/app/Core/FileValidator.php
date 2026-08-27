<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Strict server-side file validation for proof uploads (Contract Clause
 * 1.3 — "the accept= attribute doesn't count as strict", per
 * docs/ROADMAP_BACKEND.md Month 3). Three independent checks, all
 * required: extension whitelist, real content-sniffed MIME type (never
 * the client-supplied `$_FILES[...]['type']`, which is trivially
 * spoofable), and a size ceiling. First real consumer:
 * OperationController::attachProof() (2026-08-27).
 */
final class FileValidator
{
    private const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];

    /** @var array<string, string> extension => the one MIME type it must sniff as */
    private const MIME_BY_EXTENSION = [
        'pdf' => 'application/pdf',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
    ];

    private const MAX_BYTES = 5 * 1024 * 1024;

    public static function hasAllowedExtension(string $filename): bool
    {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        return in_array($extension, self::ALLOWED_EXTENSIONS, true);
    }

    public static function isWithinSizeLimit(int $bytes): bool
    {
        return $bytes > 0 && $bytes <= self::MAX_BYTES;
    }

    /**
     * The extension and the sniffed content type must agree — rejects the
     * classic "rename evil.php to proof.pdf" bypass, since the extension
     * check alone never inspects the actual bytes.
     */
    public static function contentMatchesExtension(string $filename, string $sniffedMimeType): bool
    {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        return (self::MIME_BY_EXTENSION[$extension] ?? null) === $sniffedMimeType;
    }

    /**
     * Reads the real, sniffed MIME type from file content — not
     * `$_FILES[...]['type']`, which is client-supplied and trivially
     * spoofed. Not pure (touches the filesystem via fileinfo), so it's not
     * unit-tested directly the way the two checks above are; exercised via
     * manual/Bruno testing instead.
     */
    public static function sniffMimeType(string $tmpFilePath): ?string
    {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);

        if ($finfo === false) {
            // Caller already treats null as "reject the upload" — this is
            // just so a sudden spike in rejected uploads is diagnosable as
            // "fileinfo is broken on this server" instead of a silent
            // mystery (security review, 2026-08-27).
            error_log('FileValidator::sniffMimeType() — finfo_open() failed; fileinfo extension may be missing or misconfigured.');

            return null;
        }

        $mimeType = finfo_file($finfo, $tmpFilePath);
        finfo_close($finfo);

        return $mimeType !== false ? $mimeType : null;
    }
}
