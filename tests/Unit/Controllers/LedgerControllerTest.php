<?php

declare(strict_types=1);

namespace Tests\Unit\Controllers;

use App\Controllers\LedgerController;
use PHPUnit\Framework\TestCase;

/**
 * Exercises LedgerController::buildLedger() — the pure sort + running
 * balance + per-company split, same split-for-testability pattern as
 * OperationController. index() itself calls Response::json()/error()
 * (exit()), so it's exercised manually/via Bruno, not a unit test.
 */
final class LedgerControllerTest extends TestCase
{
    public function test_running_balance_accumulates_chronologically_across_both_companies(): void
    {
        $rows = [
            ['id' => 'tx-2', 'date' => '2026-08-02', 'entered_by' => 'bakers', 'balance_delta' => -500.0],
            ['id' => 'tx-1', 'date' => '2026-08-01', 'entered_by' => 'fuellink', 'balance_delta' => 1000.0],
        ];

        $ledger = LedgerController::buildLedger($rows);

        $this->assertSame(1000.0, $ledger['fuellink'][0]['running_balance']);
        $this->assertSame(500.0, $ledger['bakers'][0]['running_balance']);
        $this->assertSame(500.0, $ledger['net_balance']);
    }

    public function test_rows_are_split_into_the_correct_companys_list(): void
    {
        $rows = [
            ['id' => 'tx-1', 'date' => '2026-08-01', 'entered_by' => 'fuellink', 'balance_delta' => 100.0],
            ['id' => 'tx-2', 'date' => '2026-08-02', 'entered_by' => 'bakers', 'balance_delta' => -50.0],
        ];

        $ledger = LedgerController::buildLedger($rows);

        $this->assertCount(1, $ledger['fuellink']);
        $this->assertCount(1, $ledger['bakers']);
        $this->assertSame('tx-1', $ledger['fuellink'][0]['id']);
        $this->assertSame('tx-2', $ledger['bakers'][0]['id']);
    }

    public function test_void_rows_are_included_and_net_out_the_original(): void
    {
        $rows = [
            ['id' => 'tx-1', 'date' => '2026-08-01', 'entered_by' => 'fuellink', 'balance_delta' => 1000.0],
            ['id' => 'tx-1-void', 'date' => '2026-08-02', 'entered_by' => 'fuellink', 'balance_delta' => -1000.0, 'type' => 'void'],
        ];

        $ledger = LedgerController::buildLedger($rows);

        $this->assertSame(0.0, $ledger['net_balance']);
        $this->assertCount(2, $ledger['fuellink']);
    }

    public function test_rows_out_of_input_order_are_sorted_by_date_before_accumulating(): void
    {
        $rows = [
            ['id' => 'later', 'date' => '2026-08-05', 'entered_by' => 'fuellink', 'balance_delta' => 100.0],
            ['id' => 'earlier', 'date' => '2026-08-01', 'entered_by' => 'fuellink', 'balance_delta' => 50.0],
        ];

        $ledger = LedgerController::buildLedger($rows);

        $this->assertSame('earlier', $ledger['fuellink'][0]['id']);
        $this->assertSame(50.0, $ledger['fuellink'][0]['running_balance']);
        $this->assertSame('later', $ledger['fuellink'][1]['id']);
        $this->assertSame(150.0, $ledger['fuellink'][1]['running_balance']);
    }

    public function test_empty_input_yields_empty_lists_and_zero_balance(): void
    {
        $ledger = LedgerController::buildLedger([]);

        $this->assertSame([], $ledger['fuellink']);
        $this->assertSame([], $ledger['bakers']);
        $this->assertSame(0.0, $ledger['net_balance']);
    }
}
