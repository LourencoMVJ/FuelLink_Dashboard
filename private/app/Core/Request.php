<?php

declare(strict_types=1);

namespace App\Core;

final class Request
{
    /**
     * @param array<string, mixed> $query
     * @param array<string, mixed> $body
     */
    private function __construct(
        private readonly array $query,
        private readonly array $body,
    ) {
    }

    public static function capture(): self
    {
        $body = [];
        $raw = file_get_contents('php://input');

        if ($raw !== false && $raw !== '') {
            $decoded = json_decode($raw, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Response::error('Malformed JSON body.', 400);
            }

            $body = is_array($decoded) ? $decoded : [];
        }

        return new self($_GET, $body);
    }

    public function query(string $key, mixed $default = null): mixed
    {
        return $this->query[$key] ?? $default;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    /** @return array<string, mixed> */
    public function all(): array
    {
        return $this->body;
    }

    /**
     * Reads a single uploaded file from `$_FILES` — deliberately separate
     * from `capture()`/the JSON body parsing above, since a
     * multipart/form-data upload has no JSON body to parse at all (PHP
     * already splits it into `$_FILES`/`$_POST` before user code runs).
     * Callers that need an uploaded file skip `Request::capture()`
     * entirely rather than risk it choking on a non-JSON body.
     *
     * @return array{name: string, type: string, tmp_name: string, error: int, size: int}|null
     */
    public static function uploadedFile(string $key): ?array
    {
        $file = $_FILES[$key] ?? null;

        if (!is_array($file) || !isset($file['tmp_name'], $file['name'], $file['error'], $file['size'])) {
            return null;
        }

        /** @var array{name: string, type: string, tmp_name: string, error: int, size: int} $file */
        return $file;
    }
}
