<?php

declare(strict_types=1);

namespace Tests\Unit\Core;

use App\Core\ImageCompressor;
use PHPUnit\Framework\TestCase;

final class ImageCompressorTest extends TestCase
{
    public function test_pdf_content_passes_through_unchanged(): void
    {
        $fakePdfBytes = '%PDF-1.4 not a real pdf but not an image either';

        $result = ImageCompressor::compress($fakePdfBytes, 'application/pdf');

        $this->assertSame($fakePdfBytes, $result);
    }

    public function test_undecodable_bytes_claiming_to_be_an_image_pass_through_unchanged(): void
    {
        $garbage = 'this is not valid image data';

        $result = ImageCompressor::compress($garbage, 'image/jpeg');

        $this->assertSame($garbage, $result);
    }

    public function test_a_small_jpeg_under_the_resize_threshold_is_still_returned_as_valid_jpeg_bytes(): void
    {
        $image = imagecreatetruecolor(100, 80);
        imagefill($image, 0, 0, imagecolorallocate($image, 120, 60, 200));
        ob_start();
        imagejpeg($image, null, 90);
        $original = (string) ob_get_clean();

        $result = ImageCompressor::compress($original, 'image/jpeg');

        // Re-decodes cleanly and keeps the original (already-small) dimensions.
        $decoded = imagecreatefromstring($result);
        $this->assertNotFalse($decoded);
        $this->assertSame(100, imagesx($decoded));
        $this->assertSame(80, imagesy($decoded));
    }

    public function test_a_large_image_is_resized_down_to_the_max_dimension(): void
    {
        $image = imagecreatetruecolor(3000, 2000);
        imagefill($image, 0, 0, imagecolorallocate($image, 10, 200, 10));
        ob_start();
        imagejpeg($image, null, 90);
        $original = (string) ob_get_clean();

        $result = ImageCompressor::compress($original, 'image/jpeg');
        $decoded = imagecreatefromstring($result);

        $this->assertNotFalse($decoded);
        $this->assertLessThanOrEqual(1600, imagesx($decoded));
        $this->assertLessThanOrEqual(1600, imagesy($decoded));
        // Aspect ratio (3:2) preserved.
        $this->assertSame(1600, max(imagesx($decoded), imagesy($decoded)));
    }

    public function test_an_image_over_the_megapixel_cap_passes_through_unchanged(): void
    {
        // 4500x4500 = ~20.25MP, just over the 20MP cap — must never be
        // decoded via imagecreatefromstring() at all (security review,
        // 2026-08-27: that decode is what risks exhausting memory on a
        // hard-to-recover-from PHP fatal, not something compress() can
        // catch after the fact).
        $image = imagecreatetruecolor(4500, 4500);
        imagefill($image, 0, 0, imagecolorallocate($image, 50, 50, 50));
        ob_start();
        imagejpeg($image, null, 90);
        $original = (string) ob_get_clean();

        $result = ImageCompressor::compress($original, 'image/jpeg');

        $this->assertSame($original, $result);
    }

    public function test_compressing_a_large_image_meaningfully_reduces_its_byte_size(): void
    {
        $image = imagecreatetruecolor(3000, 2000);
        // A gradient, not a flat fill, so JPEG compression can't trivially
        // shrink it to near-nothing regardless of resizing — a more
        // realistic stand-in for a photo than a single solid color.
        for ($x = 0; $x < 3000; $x += 10) {
            imagefilledrectangle($image, $x, 0, $x + 10, 2000, imagecolorallocate($image, $x % 256, ($x * 2) % 256, ($x * 3) % 256));
        }
        ob_start();
        imagejpeg($image, null, 100);
        $original = (string) ob_get_clean();

        $result = ImageCompressor::compress($original, 'image/jpeg');

        $this->assertLessThan(strlen($original), strlen($result));
    }
}
