<?php

declare(strict_types=1);

namespace Tests\Unit\Core;

use App\Core\FileValidator;
use PHPUnit\Framework\TestCase;

/**
 * sniffMimeType() touches the filesystem (fileinfo), so it isn't unit
 * tested here — the other 3 checks are pure and cover the actual
 * decision logic Clause 1.3 requires.
 */
final class FileValidatorTest extends TestCase
{
    public function test_has_allowed_extension_accepts_pdf(): void
    {
        $this->assertTrue(FileValidator::hasAllowedExtension('proof.pdf'));
    }

    public function test_has_allowed_extension_accepts_jpg_case_insensitively(): void
    {
        $this->assertTrue(FileValidator::hasAllowedExtension('PROOF.JPG'));
    }

    public function test_has_allowed_extension_rejects_executable_types(): void
    {
        $this->assertFalse(FileValidator::hasAllowedExtension('malicious.php'));
        $this->assertFalse(FileValidator::hasAllowedExtension('malicious.exe'));
    }

    public function test_has_allowed_extension_rejects_no_extension_at_all(): void
    {
        $this->assertFalse(FileValidator::hasAllowedExtension('noextension'));
    }

    public function test_is_within_size_limit_accepts_a_small_file(): void
    {
        $this->assertTrue(FileValidator::isWithinSizeLimit(1024));
    }

    public function test_is_within_size_limit_rejects_a_file_over_5mb(): void
    {
        $this->assertFalse(FileValidator::isWithinSizeLimit(6 * 1024 * 1024));
    }

    public function test_is_within_size_limit_rejects_zero_bytes(): void
    {
        $this->assertFalse(FileValidator::isWithinSizeLimit(0));
    }

    public function test_content_matches_extension_accepts_a_genuine_pdf(): void
    {
        $this->assertTrue(FileValidator::contentMatchesExtension('proof.pdf', 'application/pdf'));
    }

    public function test_content_matches_extension_rejects_a_php_file_renamed_to_pdf(): void
    {
        // The classic bypass this check exists to catch: extension says
        // .pdf, but the sniffed content is something else entirely.
        $this->assertFalse(FileValidator::contentMatchesExtension('evil.pdf', 'application/x-php'));
    }

    public function test_content_matches_extension_treats_jpg_and_jpeg_the_same(): void
    {
        $this->assertTrue(FileValidator::contentMatchesExtension('photo.jpg', 'image/jpeg'));
        $this->assertTrue(FileValidator::contentMatchesExtension('photo.jpeg', 'image/jpeg'));
    }
}
