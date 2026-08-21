<?php

declare(strict_types=1);

namespace Tests\Unit\Models;

use App\Core\FakeSupabaseClient;
use App\Models\TransactionModel;
use PHPUnit\Framework\TestCase;

/**
 * Exercises TransactionModel against FakeSupabaseClient — in particular
 * listActiveInRange(), which has to (a) filter a date range expressed as
 * two constraints on the same column (gte + lte), and (b) exclude a
 * transaction that has since been voided from the aggregate, per the
 * summary() KPI design decided 2026-08-21 (see docs/API_CONTRACT.md
 * Section 7 and the OperationController summary() implementation).
 */
final class TransactionModelTest extends TestCase
{
    public function test_list_active_in_range_excludes_a_voided_original(): void
    {
        $client = new FakeSupabaseClient();
        $client->seed('transactions', [
            ['id' => 'tx-1', 'type' => 'diesel', 'entered_by' => 'fuellink', 'date' => '2026-08-05', 'litres' => 1000.0, 'amount' => 27610.0],
            ['id' => 'tx-2', 'type' => 'diesel', 'entered_by' => 'fuellink', 'date' => '2026-08-10', 'litres' => 500.0, 'amount' => 13805.0],
            ['id' => 'tx-3', 'type' => 'void', 'entered_by' => 'fuellink', 'date' => '2026-08-11', 'voids_id' => 'tx-2', 'voids_type' => 'diesel'],
        ]);

        $model = new TransactionModel($client);
        $active = $model->listActiveInRange('diesel', 'fuellink', '2026-08-01', '2026-08-20');

        $this->assertCount(1, $active);
        $this->assertSame('tx-1', $active[0]['id']);
    }

    public function test_list_active_in_range_excludes_transactions_outside_the_date_range(): void
    {
        $client = new FakeSupabaseClient();
        $client->seed('transactions', [
            ['id' => 'tx-1', 'type' => 'diesel', 'entered_by' => 'fuellink', 'date' => '2026-07-31', 'litres' => 100.0, 'amount' => 100.0],
            ['id' => 'tx-2', 'type' => 'diesel', 'entered_by' => 'fuellink', 'date' => '2026-08-05', 'litres' => 100.0, 'amount' => 100.0],
            ['id' => 'tx-3', 'type' => 'diesel', 'entered_by' => 'fuellink', 'date' => '2026-08-21', 'litres' => 100.0, 'amount' => 100.0],
        ]);

        $model = new TransactionModel($client);
        $active = $model->listActiveInRange('diesel', 'fuellink', '2026-08-01', '2026-08-20');

        $this->assertCount(1, $active);
        $this->assertSame('tx-2', $active[0]['id']);
    }

    public function test_list_active_in_range_ignores_a_void_row_with_no_voids_id(): void
    {
        $client = new FakeSupabaseClient();
        $client->seed('transactions', [
            ['id' => 'tx-1', 'type' => 'diesel', 'entered_by' => 'fuellink', 'date' => '2026-08-05', 'litres' => 100.0, 'amount' => 100.0],
            // Malformed void row (no voids_id) must not suppress tx-1.
            ['id' => 'tx-2', 'type' => 'void', 'entered_by' => 'fuellink', 'date' => '2026-08-06', 'voids_type' => 'diesel'],
        ]);

        $model = new TransactionModel($client);
        $active = $model->listActiveInRange('diesel', 'fuellink', '2026-08-01', '2026-08-20');

        $this->assertCount(1, $active);
        $this->assertSame('tx-1', $active[0]['id']);
    }

    public function test_list_active_in_range_never_returns_another_companys_rows(): void
    {
        $client = new FakeSupabaseClient();
        $client->seed('transactions', [
            ['id' => 'tx-1', 'type' => 'diesel', 'entered_by' => 'fuellink', 'date' => '2026-08-05', 'litres' => 100.0, 'amount' => 100.0],
            ['id' => 'tx-2', 'type' => 'logistics', 'entered_by' => 'bakers', 'date' => '2026-08-05', 'litres' => 100.0, 'amount' => 100.0],
        ]);

        $model = new TransactionModel($client);
        $active = $model->listActiveInRange('diesel', 'fuellink', '2026-08-01', '2026-08-20');

        $this->assertCount(1, $active);
        $this->assertSame('fuellink', $active[0]['entered_by']);
    }

    public function test_find_void_for_returns_null_when_not_voided(): void
    {
        $client = new FakeSupabaseClient();
        $client->seed('transactions', [
            ['id' => 'tx-1', 'type' => 'diesel', 'entered_by' => 'fuellink'],
        ]);

        $model = new TransactionModel($client);

        $this->assertNull($model->findVoidFor('tx-1', 'diesel', 'fuellink'));
    }

    public function test_find_void_for_returns_the_void_row_when_present(): void
    {
        $client = new FakeSupabaseClient();
        $client->seed('transactions', [
            ['id' => 'tx-2', 'type' => 'void', 'entered_by' => 'fuellink', 'voids_id' => 'tx-1', 'voids_type' => 'diesel'],
        ]);

        $model = new TransactionModel($client);
        $void = $model->findVoidFor('tx-1', 'diesel', 'fuellink');

        $this->assertNotNull($void);
        $this->assertSame('tx-2', $void['id']);
    }
}
