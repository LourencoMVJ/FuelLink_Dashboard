<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\AuthMiddleware;
use App\Core\Request;
use App\Core\Response;
use App\Models\BakersSettingsModel;
use App\Models\DriverModel;
use App\Models\FuellinkSettingsModel;
use App\Models\RouteModel;
use App\Models\TransactionModel;
use App\Models\TruckModel;
use DateTimeImmutable;

/**
 * POST/PATCH/void/summary on `transactions` for both companies' operations
 * (`type='diesel'` for fuellink, `type='logistics'` for bakers — `type` is
 * always derived from the caller's own role, never taken from the request
 * body). Direct port of the old dashboard's computeTxFinancials()/
 * resolveTruck()/resolveDriver() (Antigo dashboard/fuellink-dashboard/index.html),
 * moved server-side per docs/ROADMAP_BACKEND.md Month 2 so the financial
 * amount is never trusted from the client.
 *
 * `type='settlement'` is out of scope here — see docs/API_CONTRACT.md and
 * docs/ROADMAP_BACKEND.md, neither names a settlement route; it stays on
 * the old direct-Supabase path until the Ledger de Compensação screen is
 * designed.
 *
 * The pure calc/resolution methods are static and side-effect-free (same
 * split as AuthMiddleware::verify()/isGranted()) so they're unit-testable
 * without a Model or Response::error()'s exit() — see
 * tests/Unit/Controllers/OperationControllerTest.php.
 */
final class OperationController
{
    public function __construct(
        private readonly AuthMiddleware $auth,
        private readonly TransactionModel $transactions,
        private readonly RouteModel $routes,
        private readonly TruckModel $trucks,
        private readonly DriverModel $drivers,
        private readonly FuellinkSettingsModel $fuellinkSettings,
        private readonly BakersSettingsModel $bakersSettings,
    ) {
    }

    public function create(): void
    {
        $caller = $this->auth->requireAuth();
        $this->auth->requirePermission($caller['user_id'], 'operations.create');

        $role = $caller['role'];
        $type = $role === 'fuellink' ? 'diesel' : 'logistics';
        $request = Request::capture();

        $date = (string) $request->input('date', date('Y-m-d'));
        if (!self::isValidDate($date)) {
            Response::error('Enter a valid date (YYYY-MM-DD).', 400);
        }

        $litres = self::readLitres($request, 0);
        if ($litres <= 0) {
            Response::error('Enter litres greater than 0.', 400);
        }

        $trucks = $this->trucks->all();
        $drivers = $this->drivers->all();

        $truckInput = trim((string) $request->input('truck', ''));
        if ($truckInput === '') {
            Response::error('Enter which truck this is for.', 400);
        }

        $driverInput = trim((string) $request->input('driver', ''));
        if ($driverInput === '') {
            Response::error('Enter which driver this is for.', 400);
        }

        $route = $this->resolveRoute($request, $type, '');
        $truckMatch = self::resolveTruck($truckInput, $trucks);
        $driverMatch = self::resolveDriver($driverInput, $drivers);

        $todayRate = $this->computeTodayRate($type, $route);

        $financials = self::computeFinancials(
            type: $type,
            litres: $litres,
            frozenUnitRate: null,
            todayRate: $todayRate,
            truckLabel: $truckInput,
            driverLabel: $driverInput,
            routeFrom: $route['from_point'] ?? null,
            routeTo: $route['to_point'] ?? null,
        );

        $payload = [
            'date' => $date,
            'type' => $type,
            'entered_by' => $role,
            'litres' => $litres,
            'truck_id' => $truckMatch['truck_id'],
            'truck_text' => $truckMatch['truck_text'],
            'driver_id' => $driverMatch['driver_id'],
            'driver_text' => $driverMatch['driver_text'],
            'trailer_reg' => self::nullableTrim($request->input('trailer')),
            'note' => (string) $request->input('note', ''),
            ...$financials,
        ];

        if ($type === 'logistics') {
            $payload['route_id'] = $route['id'];
        }

        Response::json($this->transactions->create($payload), 201);
    }

    public function edit(string $id): void
    {
        $caller = $this->auth->requireAuth();
        $this->auth->requirePermission($caller['user_id'], 'operations.edit');

        $tx = $this->fetchEditableTransaction($id, $caller['role']);
        $request = Request::capture();

        $litres = self::readLitres($request, $tx['litres'] ?? 0);
        if ($litres <= 0) {
            Response::error('Enter litres greater than 0.', 400);
        }

        $date = (string) $request->input('date', $tx['date']);
        if (!self::isValidDate($date)) {
            Response::error('Enter a valid date (YYYY-MM-DD).', 400);
        }

        $trucks = $this->trucks->all();
        $drivers = $this->drivers->all();

        // Omitting truck/driver from a PATCH must keep the current
        // assignment, not clear it — docs/API_CONTRACT.md Section 5 treats
        // the request as a partial update ("subconjunto de ... truck,
        // driver, ..."). Defaulting to '' here would silently null out the
        // Fleet assignment on any edit that only touches, say, the note.
        $truckInput = trim((string) $request->input(
            'truck',
            self::currentFleetLabel($tx['truck_id'] ?? null, $tx['truck_text'] ?? null, $trucks, 'reg_number'),
        ));
        if ($truckInput === '') {
            Response::error('Enter which truck this is for.', 400);
        }

        $driverInput = trim((string) $request->input(
            'driver',
            self::currentFleetLabel($tx['driver_id'] ?? null, $tx['driver_text'] ?? null, $drivers, 'name'),
        ));
        if ($driverInput === '') {
            Response::error('Enter which driver this is for.', 400);
        }

        $route = $this->resolveRoute($request, $tx['type'], $tx['route_id'] ?? '');

        $truckMatch = self::resolveTruck($truckInput, $trucks);
        $driverMatch = self::resolveDriver($driverInput, $drivers);

        // Never re-derive today's rate here: an edit always freezes to the
        // transaction's own unit_rate, or (for pre-unit_rate legacy rows)
        // falls back to today's rate exactly once, same as the JS original.
        $todayRate = $this->computeTodayRate($tx['type'], $route);

        $financials = self::computeFinancials(
            type: $tx['type'],
            litres: $litres,
            frozenUnitRate: isset($tx['unit_rate']) ? (float) $tx['unit_rate'] : null,
            todayRate: $todayRate,
            truckLabel: $truckInput,
            driverLabel: $driverInput,
            routeFrom: $route['from_point'] ?? null,
            routeTo: $route['to_point'] ?? null,
        );

        $payload = [
            'date' => $date,
            'litres' => $litres,
            'truck_id' => $truckMatch['truck_id'],
            'truck_text' => $truckMatch['truck_text'],
            'driver_id' => $driverMatch['driver_id'],
            'driver_text' => $driverMatch['driver_text'],
            'trailer_reg' => self::nullableTrim($request->input('trailer', $tx['trailer_reg'] ?? null)),
            'note' => (string) $request->input('note', $tx['note'] ?? ''),
            ...$financials,
        ];

        if ($tx['type'] === 'logistics') {
            $payload['route_id'] = $route['id'];
        }

        Response::json($this->transactions->patch($id, $caller['role'], $payload));
    }

    public function void(string $id): void
    {
        $caller = $this->auth->requireAuth();
        $this->auth->requirePermission($caller['user_id'], 'operations.void');

        $tx = $this->fetchEditableTransaction($id, $caller['role']);
        $payload = self::buildVoidPayload($tx, $caller['role'], date('Y-m-d'));

        Response::json($this->transactions->insertVoid($payload), 201);
    }

    public function summary(): void
    {
        $caller = $this->auth->requireAuth();
        $request = Request::capture();

        $from = (string) $request->query('from', '0001-01-01');
        $to = (string) $request->query('to', '9999-12-31');
        if (!self::isValidDate($from) || !self::isValidDate($to)) {
            Response::error('Enter valid from/to dates (YYYY-MM-DD).', 400);
        }

        $compareFrom = $request->query('compareFrom');
        $compareTo = $request->query('compareTo');

        $type = $caller['role'] === 'fuellink' ? 'diesel' : 'logistics';
        $period = $this->summarizePeriod($type, $caller['role'], $from, $to);

        if ($compareFrom !== null && $compareTo !== null) {
            $compareFrom = (string) $compareFrom;
            $compareTo = (string) $compareTo;
            if (!self::isValidDate($compareFrom) || !self::isValidDate($compareTo)) {
                Response::error('Enter valid compareFrom/compareTo dates (YYYY-MM-DD).', 400);
            }

            $period['compare'] = $this->summarizePeriod($type, $caller['role'], $compareFrom, $compareTo);
        }

        Response::json($period);
    }

    /** @return array<string, mixed> */
    private function summarizePeriod(string $type, string $role, string $from, string $to): array
    {
        $active = $this->transactions->listActiveInRange($type, $role, $from, $to);

        $litres = array_sum(array_map(static fn (array $tx): float => (float) ($tx['litres'] ?? 0), $active));
        $total = array_sum(array_map(static fn (array $tx): float => (float) ($tx['amount'] ?? 0), $active));
        $count = count($active);
        $avgRate = $litres > 0 ? $total / $litres : 0.0;

        if ($type === 'diesel') {
            return [
                'litres_sold' => $litres,
                'total_sold' => $total,
                'operations_count' => $count,
                'avg_diesel_price' => $avgRate,
            ];
        }

        return [
            'litres_transported' => $litres,
            'total_supply_value' => $total,
            'deliveries_count' => $count,
            'delivered_litres_diff' => null,
        ];
    }

    /** @return array<string, mixed> */
    private function fetchEditableTransaction(string $id, string $role): array
    {
        $tx = $this->transactions->findById($id, $role);

        if ($tx === null) {
            Response::error('Operation not found.', 404);
        }

        if ($tx['type'] === 'void') {
            Response::error('Cannot edit or void a void entry.', 409);
        }

        if ($this->transactions->findVoidFor($id, $tx['type'], $role) !== null) {
            Response::error('This operation has already been voided.', 409);
        }

        return $tx;
    }

    /**
     * Resolves a route for logistics operations. Returns null for non-logistics
     * operations; raises a 400 error if a logistics operation references an
     * invalid route.
     *
     * @return array<string, mixed>|null
     */
    private function resolveRoute(Request $request, string $type, string $defaultRouteId): ?array
    {
        if ($type !== 'logistics') {
            return null;
        }

        $routeId = (string) $request->input('route_id', $defaultRouteId);
        $route = $routeId === '' ? null : $this->routes->find($routeId);

        if ($route === null) {
            Response::error('Select a valid route.', 400);
        }

        return $route;
    }

    /** Computes the applicable rate for the transaction type and route. */
    private function computeTodayRate(string $type, ?array $route): float
    {
        return $type === 'diesel'
            ? $this->fuellinkSettings->dieselPrice()
            : self::routeTotalRate($route, $this->bakersSettings->activeMonth());
    }

    // ------------------------------------------------------------------
    // Pure, static risk units — no I/O, no Response::error() — see
    // tests/Unit/Controllers/OperationControllerTest.php.
    // ------------------------------------------------------------------

    /**
     * Port of computeTxFinancials() (diesel/logistics branches only —
     * settlement is out of scope, see class docblock). On create,
     * $frozenUnitRate is null so it prices at $todayRate; on edit, the
     * transaction's own unit_rate is passed so correcting unrelated fields
     * never silently re-prices at today's rate.
     *
     * @return array{amount: float, balance_delta: float, unit_rate: float, detail: string}
     */
    public static function computeFinancials(
        string $type,
        float $litres,
        ?float $frozenUnitRate,
        float $todayRate,
        string $truckLabel,
        ?string $driverLabel = null,
        ?string $routeFrom = null,
        ?string $routeTo = null,
    ): array {
        $rate = $frozenUnitRate ?? $todayRate;
        $amount = $litres * $rate;

        if ($type === 'diesel') {
            return [
                'amount' => $amount,
                'balance_delta' => $amount,
                'unit_rate' => $rate,
                'detail' => sprintf('Diesel @ R%.2f/L -> Truck %s', $rate, $truckLabel),
            ];
        }

        return [
            'amount' => $amount,
            'balance_delta' => -$amount,
            'unit_rate' => $rate,
            'detail' => sprintf('%s → %s @ R%.4f/L (Truck %s, Driver %s)', $routeFrom, $routeTo, $rate, $truckLabel, $driverLabel),
        ];
    }

    /** Strict YYYY-MM-DD check — rejects malformed input before it ever reaches the database. */
    public static function isValidDate(string $date): bool
    {
        $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);

        return $parsed !== false && $parsed->format('Y-m-d') === $date;
    }

    /** @param array<string, mixed>|null $route */
    public static function routeTotalRate(?array $route, string $activeMonth): float
    {
        $base = (float) ($route['base_rate'] ?? 0);
        $adj = (float) ($route['adj_' . $activeMonth] ?? 0);

        return $base + $adj / 100;
    }

    /**
     * Free-text truck input matched against the Fleet (exact,
     * case-insensitive); no auto-creation of Fleet rows from unmatched text
     * — same as the JS original.
     *
     * @param list<array<string, mixed>> $trucks
     * @return array{truck_id: ?string, truck_text: ?string}
     */
    public static function resolveTruck(string $text, array $trucks): array
    {
        return self::resolveFleetText($text, $trucks, 'reg_number', 'truck_id', 'truck_text');
    }

    /**
     * @param list<array<string, mixed>> $drivers
     * @return array{driver_id: ?string, driver_text: ?string}
     */
    public static function resolveDriver(string $text, array $drivers): array
    {
        return self::resolveFleetText($text, $drivers, 'name', 'driver_id', 'driver_text');
    }

    /** @param list<array<string, mixed>> $fleet @return array<string, string|null> */
    private static function resolveFleetText(string $text, array $fleet, string $matchColumn, string $idKey, string $textKey): array
    {
        $trimmed = trim($text);

        if ($trimmed === '') {
            return [$idKey => null, $textKey => null];
        }

        foreach ($fleet as $row) {
            if (strcasecmp((string) ($row[$matchColumn] ?? ''), $trimmed) === 0) {
                return [$idKey => (string) $row['id'], $textKey => null];
            }
        }

        return [$idKey => null, $textKey => $trimmed];
    }

    /**
     * The Fleet display label a transaction currently shows for its
     * truck/driver — mirrors truckDisplayText()/driverDisplayText() from the
     * old dashboard's JS: prefer the live Fleet row's label if the id still
     * resolves, otherwise fall back to the free-text value stored at entry
     * time. Used as the edit() default when the request omits the field.
     *
     * @param list<array<string, mixed>> $fleet
     */
    public static function currentFleetLabel(?string $id, ?string $text, array $fleet, string $matchColumn): string
    {
        if ($id !== null) {
            foreach ($fleet as $row) {
                if ((string) ($row['id'] ?? '') === $id) {
                    return (string) ($row[$matchColumn] ?? '');
                }
            }
        }

        return (string) ($text ?? '');
    }

    /**
     * Rejects a non-numeric `litres` (e.g. "123abc") instead of letting a
     * (float) cast silently coerce it to a partial-match number — a client
     * typo would otherwise be stored as a plausible-looking but wrong
     * quantity with no trace of the coercion.
     */
    private static function readLitres(Request $request, mixed $default): float
    {
        $raw = $request->input('litres', $default);

        if (!is_numeric($raw)) {
            Response::error('Litres must be a number.', 400);
        }

        return (float) $raw;
    }

    /**
     * Reversing entry for a void: same amount, inverted balance_delta,
     * original preserved untouched (append-only) — port of the JS
     * original's voidTransaction() insert payload.
     *
     * @param array<string, mixed> $original
     * @return array<string, mixed>
     */
    public static function buildVoidPayload(array $original, string $enteredBy, string $today): array
    {
        return [
            'date' => $today,
            'type' => 'void',
            'voids_id' => $original['id'],
            'voids_type' => $original['type'],
            'amount' => $original['amount'],
            'balance_delta' => -(float) $original['balance_delta'],
            'litres' => $original['litres'] ?? null,
            'entered_by' => $enteredBy,
            'note' => '',
            'detail' => 'Void of: ' . $original['detail'],
        ];
    }

    private static function nullableTrim(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
