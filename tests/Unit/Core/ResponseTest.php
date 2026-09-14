<?php

declare(strict_types=1);

namespace Tests\Unit\Core;

use App\Core\Response;
use PHPUnit\Framework\TestCase;

final class ResponseTest extends TestCase
{
    public function test_envelope_wraps_success_data(): void
    {
        $envelope = Response::envelope(true, ['foo' => 'bar'], null, ['page' => 1]);

        $this->assertSame([
            'success' => true,
            'data' => ['foo' => 'bar'],
            'error' => null,
            'meta' => ['page' => 1],
        ], $envelope);
    }

    public function test_envelope_wraps_error_message_with_no_data(): void
    {
        $envelope = Response::envelope(false, null, 'Something went wrong.');

        $this->assertFalse($envelope['success']);
        $this->assertNull($envelope['data']);
        $this->assertSame('Something went wrong.', $envelope['error']);
        $this->assertNull($envelope['meta']);
    }
}
