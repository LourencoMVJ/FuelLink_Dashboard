<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Recompresses a proof photo before it's stored — decided 2026-08-27
 * alongside the move to local (cPanel) storage: a typical phone photo
 * (often several MB) shrinks to roughly 150-400KB after resizing to a
 * 1600px long edge and re-encoding, which matters a lot against a fixed
 * disk quota. PDFs and anything GD can't decode pass through untouched —
 * fails open (returns the original bytes) rather than ever losing an
 * upload over a compression problem, since compression is an
 * optimization, not a correctness requirement.
 *
 * No `imagedestroy()` calls — deprecated as of PHP 8.0 (a no-op; `GdImage`
 * objects are garbage-collected like any other object now).
 */
final class ImageCompressor
{
    private const MAX_DIMENSION = 1600;
    private const JPEG_QUALITY = 78;
    private const PNG_COMPRESSION = 6;

    /**
     * GD decodes a full bitmap into memory at ~4 bytes/pixel before any
     * resizing happens — a 20MP image is already an ~80MB decode buffer,
     * and that allocation failing is a hard PHP memory-exhaustion fatal,
     * not a catchable error `@`-suppression or try/catch can recover from
     * (security review, 2026-08-27). Checking the pixel count from the
     * image header (`getimagesizefromstring()`, which doesn't decode
     * pixel data) before ever calling `imagecreatefromstring()` avoids
     * attempting a decode we can already predict is unsafe — well under
     * even a conservative 128M `memory_limit`, with headroom left over for
     * everything else the request is doing.
     */
    private const MAX_MEGAPIXELS = 20;

    private const COMPRESSIBLE_MIME_TYPES = ['image/jpeg', 'image/png'];

    public static function compress(string $contents, string $mimeType): string
    {
        if (!in_array($mimeType, self::COMPRESSIBLE_MIME_TYPES, true) || !function_exists('imagecreatefromstring')) {
            return $contents;
        }

        $dimensions = @getimagesizefromstring($contents);

        if ($dimensions === false || ($dimensions[0] * $dimensions[1]) > self::MAX_MEGAPIXELS * 1_000_000) {
            return $contents;
        }

        $image = @imagecreatefromstring($contents);

        if ($image === false) {
            return $contents;
        }

        $image = self::resizeIfNeeded($image);
        $encoded = self::encode($image, $mimeType);

        return $encoded !== null && $encoded !== '' ? $encoded : $contents;
    }

    /** @param \GdImage $image */
    private static function resizeIfNeeded(\GdImage $image): \GdImage
    {
        $width = imagesx($image);
        $height = imagesy($image);
        $longEdge = max($width, $height);

        if ($longEdge <= self::MAX_DIMENSION) {
            return $image;
        }

        $scale = self::MAX_DIMENSION / $longEdge;
        $newWidth = max(1, (int) round($width * $scale));
        $newHeight = max(1, (int) round($height * $scale));

        $resized = imagecreatetruecolor($newWidth, $newHeight);
        // Preserves transparency for PNGs — without this, a transparent
        // background silently turns solid black after resampling.
        imagealphablending($resized, false);
        imagesavealpha($resized, true);

        imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        return $resized;
    }

    private static function encode(\GdImage $image, string $mimeType): ?string
    {
        ob_start();

        if ($mimeType === 'image/png') {
            imagepng($image, null, self::PNG_COMPRESSION);
        } else {
            imagejpeg($image, null, self::JPEG_QUALITY);
        }

        $encoded = ob_get_clean();

        return $encoded !== false ? $encoded : null;
    }
}
