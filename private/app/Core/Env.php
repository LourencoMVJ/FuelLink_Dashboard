<?php

declare(strict_types=1);

namespace App\Core;

use RuntimeException;

final class Env
{
    private const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_JWT_MODEL'];

    /** @var array<string, string>|null */
    private static ?array $values = null;

    public static function load(?string $path = null): void
    {
        $path ??= dirname(__DIR__, 2) . '/config/env.php';

        if (!is_file($path)) {
            throw new RuntimeException(
                "Missing {$path} — copy private/config/env.example.php to env.php and fill in real values."
            );
        }

        /** @var array<string, string> $values */
        $values = require $path;

        foreach (self::REQUIRED as $key) {
            if (empty($values[$key])) {
                throw new RuntimeException("Missing required env value: {$key}");
            }
        }

        self::$values = $values;
    }

    public static function get(string $key): string
    {
        if (self::$values === null) {
            self::load();
        }

        if (!array_key_exists($key, self::$values)) {
            throw new RuntimeException("Unknown env key requested: {$key}");
        }

        return self::$values[$key];
    }

    /** @param array<string, string> $values */
    public static function setForTesting(array $values): void
    {
        self::$values = $values;
    }
}
