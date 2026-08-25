<?php

declare(strict_types=1);

namespace Tests\Unit\Models;

use App\Core\FakeSupabaseClient;
use App\Models\PasswordResetRequestModel;
use PHPUnit\Framework\TestCase;

final class PasswordResetRequestModelTest extends TestCase
{
    public function test_create_inserts_a_pending_request_for_the_given_email(): void
    {
        $client = new FakeSupabaseClient();
        $model = new PasswordResetRequestModel($client);

        $row = $model->create('waseem@bakers.co.za');

        $this->assertSame('waseem@bakers.co.za', $row['email']);
        $this->assertSame('pending', $row['status']);

        $stored = $client->get('password_reset_requests', ['email' => 'eq.waseem@bakers.co.za']);
        $this->assertCount(1, $stored);
    }

    public function test_has_pending_request_since_is_true_for_a_recent_pending_request(): void
    {
        $client = new FakeSupabaseClient();
        $client->seed('password_reset_requests', [
            ['email' => 'waseem@bakers.co.za', 'status' => 'pending', 'requested_at' => '2026-08-24T10:00:00+00:00'],
        ]);
        $model = new PasswordResetRequestModel($client);

        $this->assertTrue($model->hasPendingRequestSince('waseem@bakers.co.za', '2026-08-24T09:00:00+00:00'));
    }

    public function test_has_pending_request_since_is_false_when_the_request_is_older_than_the_cutoff(): void
    {
        $client = new FakeSupabaseClient();
        $client->seed('password_reset_requests', [
            ['email' => 'waseem@bakers.co.za', 'status' => 'pending', 'requested_at' => '2026-08-24T07:00:00+00:00'],
        ]);
        $model = new PasswordResetRequestModel($client);

        $this->assertFalse($model->hasPendingRequestSince('waseem@bakers.co.za', '2026-08-24T09:00:00+00:00'));
    }

    public function test_has_pending_request_since_ignores_already_resolved_requests(): void
    {
        $client = new FakeSupabaseClient();
        $client->seed('password_reset_requests', [
            ['email' => 'waseem@bakers.co.za', 'status' => 'resolved', 'requested_at' => '2026-08-24T10:00:00+00:00'],
        ]);
        $model = new PasswordResetRequestModel($client);

        $this->assertFalse($model->hasPendingRequestSince('waseem@bakers.co.za', '2026-08-24T09:00:00+00:00'));
    }

    public function test_has_pending_request_since_ignores_other_emails(): void
    {
        $client = new FakeSupabaseClient();
        $client->seed('password_reset_requests', [
            ['email' => 'someone.else@bakers.co.za', 'status' => 'pending', 'requested_at' => '2026-08-24T10:00:00+00:00'],
        ]);
        $model = new PasswordResetRequestModel($client);

        $this->assertFalse($model->hasPendingRequestSince('waseem@bakers.co.za', '2026-08-24T09:00:00+00:00'));
    }
}
