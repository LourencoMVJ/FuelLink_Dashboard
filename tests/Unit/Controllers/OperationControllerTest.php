<?php

declare(strict_types=1);

namespace Tests\Unit\Controllers;

use App\Controllers\OperationController;
use PHPUnit\Framework\TestCase;

/**
 * Exercises OperationController's pure, static risk units — the direct port
 * of the old dashboard's computeTxFinancials()/resolveTruck()/resolveDriver()
 * (Antigo dashboard/fuellink-dashboard/index.html) plus the void payload
 * builder. Same split-for-testability pattern as AuthMiddleware: these never
 * touch a Model or Response::error()'s exit(), so they're safe to call
 * directly in a test process. See docs/ROADMAP_BACKEND.md Section 7 — this
 * is the named M2 risk unit ("computeTxFinancials").
 */
final class OperationControllerTest extends TestCase
{
    // ---------- computeFinancials: diesel ----------

    public function test_diesel_prices_at_todays_rate_when_no_frozen_rate_is_given(): void
    {
        $result = OperationController::computeFinancials(
            type: 'diesel',
            litres: 1000.0,
            frozenUnitRate: null,
            todayRate: 27.61,
            truckLabel: 'BT123GP',
        );

        $this->assertSame(27610.0, $result['amount']);
        $this->assertSame(27610.0, $result['balance_delta']);
        $this->assertSame(27.61, $result['unit_rate']);
        $this->assertSame('Diesel @ R27.61/L -> Truck BT123GP', $result['detail']);
    }

    public function test_diesel_edit_reprices_at_the_frozen_rate_not_todays_rate(): void
    {
        $result = OperationController::computeFinancials(
            type: 'diesel',
            litres: 500.0,
            frozenUnitRate: 25.00,
            todayRate: 30.00, // today's price moved since creation
            truckLabel: 'BT999GP',
        );

        $this->assertSame(12500.0, $result['amount']);
        $this->assertSame(25.00, $result['unit_rate']);
    }

    public function test_diesel_balance_delta_is_positive_amount(): void
    {
        $result = OperationController::computeFinancials(
            type: 'diesel',
            litres: 100.0,
            frozenUnitRate: 10.0,
            todayRate: 10.0,
            truckLabel: 'T1',
        );

        $this->assertSame($result['amount'], $result['balance_delta']);
    }

    // ---------- computeFinancials: logistics ----------

    public function test_logistics_balance_delta_is_negative_amount(): void
    {
        $result = OperationController::computeFinancials(
            type: 'logistics',
            litres: 200.0,
            frozenUnitRate: null,
            todayRate: 5.0,
            truckLabel: 'T2',
            driverLabel: 'John Doe',
            routeFrom: 'Maputo',
            routeTo: 'Beira',
        );

        $this->assertSame(1000.0, $result['amount']);
        $this->assertSame(-1000.0, $result['balance_delta']);
    }

    public function test_logistics_detail_includes_route_truck_and_driver(): void
    {
        $result = OperationController::computeFinancials(
            type: 'logistics',
            litres: 40000.0,
            frozenUnitRate: null,
            todayRate: 1.2345,
            truckLabel: 'BT123GP',
            driverLabel: 'John Doe',
            routeFrom: 'Maputo',
            routeTo: 'Beira',
        );

        $this->assertSame('Maputo → Beira @ R1.2345/L (Truck BT123GP, Driver John Doe)', $result['detail']);
    }

    // ---------- routeTotalRate ----------

    public function test_route_total_rate_adds_the_active_months_adjustment_in_cents(): void
    {
        $route = ['base_rate' => 10.0, 'adj_july' => 50.0];

        $rate = OperationController::routeTotalRate($route, 'july');

        $this->assertSame(10.5, $rate);
    }

    public function test_route_total_rate_defaults_missing_adjustment_to_zero(): void
    {
        $route = ['base_rate' => 10.0];

        $rate = OperationController::routeTotalRate($route, 'may');

        $this->assertSame(10.0, $rate);
    }

    // ---------- resolveTruck / resolveDriver ----------

    public function test_resolve_truck_matches_fleet_case_insensitively(): void
    {
        $trucks = [['id' => 'uuid-1', 'reg_number' => 'BT123GP']];

        $result = OperationController::resolveTruck('bt123gp', $trucks);

        $this->assertSame(['truck_id' => 'uuid-1', 'truck_text' => null], $result);
    }

    public function test_resolve_truck_falls_back_to_free_text_when_no_fleet_match(): void
    {
        $trucks = [['id' => 'uuid-1', 'reg_number' => 'BT123GP']];

        $result = OperationController::resolveTruck('New Truck 99', $trucks);

        $this->assertSame(['truck_id' => null, 'truck_text' => 'New Truck 99'], $result);
    }

    public function test_resolve_truck_trims_whitespace_before_matching(): void
    {
        $trucks = [['id' => 'uuid-1', 'reg_number' => 'BT123GP']];

        $result = OperationController::resolveTruck('  BT123GP  ', $trucks);

        $this->assertSame('uuid-1', $result['truck_id']);
    }

    public function test_resolve_driver_matches_fleet_case_insensitively(): void
    {
        $drivers = [['id' => 'uuid-2', 'name' => 'John Doe']];

        $result = OperationController::resolveDriver('JOHN DOE', $drivers);

        $this->assertSame(['driver_id' => 'uuid-2', 'driver_text' => null], $result);
    }

    public function test_resolve_driver_falls_back_to_free_text_when_no_fleet_match(): void
    {
        $result = OperationController::resolveDriver('Someone New', []);

        $this->assertSame(['driver_id' => null, 'driver_text' => 'Someone New'], $result);
    }

    // ---------- buildVoidPayload ----------

    public function test_void_payload_negates_balance_delta_and_preserves_amount(): void
    {
        $original = [
            'id' => 'tx-1',
            'type' => 'diesel',
            'amount' => 27610.0,
            'balance_delta' => 27610.0,
            'litres' => 1000.0,
            'detail' => 'Diesel @ R27.61/L -> Truck BT123GP',
        ];

        $payload = OperationController::buildVoidPayload($original, 'fuellink', '2026-08-21');

        $this->assertSame('void', $payload['type']);
        $this->assertSame('tx-1', $payload['voids_id']);
        $this->assertSame('diesel', $payload['voids_type']);
        $this->assertSame(27610.0, $payload['amount']);
        $this->assertSame(-27610.0, $payload['balance_delta']);
        $this->assertSame(1000.0, $payload['litres']);
        $this->assertSame('fuellink', $payload['entered_by']);
        $this->assertSame('2026-08-21', $payload['date']);
        $this->assertSame('Void of: Diesel @ R27.61/L -> Truck BT123GP', $payload['detail']);
    }

    public function test_void_payload_negates_a_negative_balance_delta_back_to_positive(): void
    {
        $original = [
            'id' => 'tx-2',
            'type' => 'logistics',
            'amount' => 1000.0,
            'balance_delta' => -1000.0,
            'litres' => 200.0,
            'detail' => 'Maputo -> Beira',
        ];

        $payload = OperationController::buildVoidPayload($original, 'bakers', '2026-08-21');

        $this->assertSame(1000.0, $payload['balance_delta']);
    }

    // ---------- currentFleetLabel ----------

    public function test_current_fleet_label_prefers_the_live_fleet_row_when_the_id_still_resolves(): void
    {
        $trucks = [['id' => 'uuid-1', 'reg_number' => 'BT123GP']];

        // Free text stored at entry time is stale/irrelevant once the id resolves.
        $label = OperationController::currentFleetLabel('uuid-1', 'Old Stale Text', $trucks, 'reg_number');

        $this->assertSame('BT123GP', $label);
    }

    public function test_current_fleet_label_falls_back_to_stored_free_text_when_id_is_null(): void
    {
        $label = OperationController::currentFleetLabel(null, 'New Truck 99', [], 'reg_number');

        $this->assertSame('New Truck 99', $label);
    }

    public function test_current_fleet_label_falls_back_to_stored_free_text_when_the_id_no_longer_resolves(): void
    {
        $label = OperationController::currentFleetLabel('deleted-uuid', 'Fallback Text', [], 'reg_number');

        $this->assertSame('Fallback Text', $label);
    }

    public function test_current_fleet_label_returns_empty_string_when_nothing_is_available(): void
    {
        $label = OperationController::currentFleetLabel(null, null, [], 'reg_number');

        $this->assertSame('', $label);
    }

    // ---------- isValidDate ----------

    public function test_is_valid_date_accepts_a_well_formed_date(): void
    {
        $this->assertTrue(OperationController::isValidDate('2026-08-21'));
    }

    public function test_is_valid_date_rejects_free_text(): void
    {
        $this->assertFalse(OperationController::isValidDate('not-a-date'));
    }

    public function test_is_valid_date_rejects_an_out_of_range_month_or_day(): void
    {
        $this->assertFalse(OperationController::isValidDate('2026-13-45'));
    }

    public function test_is_valid_date_rejects_a_non_padded_date(): void
    {
        $this->assertFalse(OperationController::isValidDate('2026-8-1'));
    }

    public function test_is_valid_date_rejects_empty_string(): void
    {
        $this->assertFalse(OperationController::isValidDate(''));
    }
}
