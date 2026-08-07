# private/app/Models

One Model per Supabase table, talking to the Supabase REST API on behalf of
Controllers. Nothing here yet — no Month-1 work has started.

## Existing Models

_(none yet)_

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

## Fixed rule

Note here immediately if a Model ends up not mapping 1:1 to a table (e.g. if
`operations` from the original greenfield design is implemented as a view
over `transactions` rather than its own table) — this is exactly the kind of
drift the reconciliation section (main handoff doc, Section 5) warned about.
