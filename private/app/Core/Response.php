<?php

declare(strict_types=1);

namespace App\Core;

final class Response
{
    /**
     * Pure envelope builder — no I/O, no exit. This is the unit-testable
     * seam; json()/error() below are the side-effecting HTTP emitters that
     * wrap it.
     *
     * @param array<string, mixed>|null $meta
     * @return array{success: bool, data: mixed, error: string|null, meta: array<string, mixed>|null}
     */
    public static function envelope(bool $success, mixed $data, ?string $error, ?array $meta = null): array
    {
        return [
            'success' => $success,
            'data' => $data,
            'error' => $error,
            'meta' => $meta,
        ];
    }

    /** @param array<string, mixed>|null $meta */
    public static function json(mixed $data, int $status = 200, ?array $meta = null): never
    {
        self::emit(self::envelope(true, $data, null, $meta), $status);
    }

    /** @param array<string, mixed>|null $meta */
    public static function error(string $message, int $status = 400, ?array $meta = null): never
    {
        self::emit(self::envelope(false, null, $message, $meta), $status);
    }

    /** @param array{success: bool, data: mixed, error: string|null, meta: array<string, mixed>|null} $envelope */
    private static function emit(array $envelope, int $status): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($envelope, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }
}
