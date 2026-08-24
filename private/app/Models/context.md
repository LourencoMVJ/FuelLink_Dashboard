# private/app/Models

One Model per Supabase table, talking to the Supabase REST API on behalf of
Controllers. Nothing here yet — no Month-1 work has started.

**Testability rule**: a Model receives its `SupabaseClientInterface` by
constructor injection — it never does `new SupabaseClient(...)` internally.
That's what lets unit tests pass a `FakeSupabaseClient` instead of touching
production (risk-based TDD, [docs/ROADMAP_BACKEND.md](../../../docs/ROADMAP_BACKEND.md)
Section 7).

## Existing Models

- `UserRoleModel` (2026-08-23/24 — `create()`/`patch()`/`findByUserId()`) —
  `user_roles`. Always used with a service-mode client (`UserController`) —
  writing this table is admin-only, never RLS-scoped to the caller.
  `patch()` is currently blocked in production by a `log_audit()` trigger
  bug unrelated to this Model — see `database/migrations/context.md`
  (migration `0005`).
- `TransactionModel` (2026-08-21) — `transactions`. `create()`/`patch()`/
  `insertVoid()`/`findById()`/`findVoidFor()`/`listActiveInRange()`. Every
  read method takes `entered_by` explicitly and filters on it — defense in
  depth alongside RLS (migration `0004`), and the only way company scoping
  is enforced at all in unit tests (`FakeSupabaseClient` has no RLS
  concept). `listActiveInRange()` excludes voided originals by
  cross-referencing every void of that type/company (not date-scoped — a
  void can post after the original's own date), same technique already
  documented for the frontend's own "Estado" derivation
  ([docs/API_CONTRACT.md](../../../docs/API_CONTRACT.md) Section 3).
- `RouteModel` — `routes`, `find($id)` only.
- `TruckModel` / `DriverModel` — `trucks`/`drivers`, `all()` only; **not**
  scoped by `entered_by` — Fleet is shared reference data across both
  companies, per the existing free-text-with-Fleet-fallback design
  (migration 0002).
- `FuellinkSettingsModel` / `BakersSettingsModel` — the two single-row
  settings tables (`id=1`), `dieselPrice()` / `activeMonth()`.

## Real tables to map against (see [database/migrations/context.md](../../../database/migrations/context.md))

These are the actual production tables — confirmed via the Antigo dashboard
frontend and migrations 0001-0003, not the greenfield names from the
pre-schema design phase:

| Table | Notes |
|---|---|
| `user_roles` | `role` = company (`bakers`/`fuellink`), not Admin/User. Month 1 extends this. |
| `routes` | `adj_may`/`adj_june`/`adj_july` — new month = new column (ALTER TABLE), see reconciliation point 6. |
| `fuellink_settings` | single row (`id=1`), global diesel price. |
| `bakers_settings` | single row (`id=1`), active adjustment month. |
| `transactions` | the shared ledger — `type` discriminates `logistics`/`diesel`/`settlement`/`void`. Append-only in principle; a narrow, column-scoped UPDATE exception now exists (migration 0003) covering everything except `type`, `entered_by`, `voids_id`, `voids_type`, `id`, `created_at`. Every UPDATE is captured in `audit_log` via trigger. |
| `trucks` / `drivers` | normalized Fleet tables, but `transactions.truck_text`/`driver_text` (migration 0002) let an operation record a truck/driver that isn't in the Fleet yet — no auto-creation of Fleet rows from free text. |
| `audit_log` | append-only, trigger-written only (SECURITY DEFINER), one row per changed field. Not surfaced in UI yet. |

## The 2 existing accounts (Month 1 must not break these)

The live dashboard hardcodes exactly two Supabase Auth accounts, mapped by
role in JS (`ROLE_EMAIL` in the Antigo dashboard `<script>`):
`waseem@bakers.co.za` (bakers) and `info@fuelink.co.za` (fuellink). Each has
one row in `user_roles`. Whatever Month 1 builds for user
management/permissions has to extend cleanly from these two real rows —
don't design a migration that requires re-creating or renaming them.

## Fixed rule

Note here immediately if a Model ends up not mapping 1:1 to a table (e.g. if
`operations` from the original greenfield design is implemented as a view
over `transactions` rather than its own table) — this is exactly the kind of
drift the reconciliation section (main handoff doc, Section 5) warned about.
