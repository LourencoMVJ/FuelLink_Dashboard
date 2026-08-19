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
}
