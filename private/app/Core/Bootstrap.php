<?php

declare(strict_types=1);

namespace App\Core;

use ErrorException;
use RuntimeException;
use Throwable;

final class Bootstrap
{
    public static function init(): void
    {
        // Errors are logged server-side only — never echoed to the client,
        // which could leak Supabase secrets or internal paths.
        ini_set('display_errors', '0');
        error_reporting(E_ALL);

        set_exception_handler(static function (Throwable $e): void {
            error_log('[unhandled] ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            Response::error('Internal server error.', 500);
        });

        set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
            if (!(error_reporting() & $severity)) {
                return false;
            }

            throw new ErrorException($message, 0, $severity, $file, $line);
        });

        self::ensureStorageDir();
        Env::load();
    }

    private static function ensureStorageDir(): void
    {
        $dir = dirname(__DIR__, 2) . '/storage';

        if (is_dir($dir)) {
            return;
        }

        if (!mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new RuntimeException("Could not create storage directory: {$dir}");
        }
    }
}
