# database/migrations

SQL run manually against the client's real, already-in-production Supabase
project (see main handoff doc, Section 3). This is not a fresh schema —
**before writing any new migration, check the actual current schema first**,
never assume a table/column doesn't exist just because it's not in the main
handoff doc's Section 3 snapshot (that snapshot predates 0001-0003 below).

**No new migrations get created for changes that are already live** — if the
schema already has something, document it here instead of re-migrating it.

## Applied (confirmed against production)

All three are confirmed applied: the live dashboard
(`Antigo dashboard/fuellink-dashboard/index.html`) actively reads/writes
`truck_text`, `driver_text`, `trailer_reg`, `unit_rate`, and queries
`audit_log` — none of that works unless 0001-0003 already ran.

1. **0001_transactions_add_trailer_and_edit.sql** — adds
   `transactions.trailer_reg` (free text). Opens a narrow column-level
   UPDATE grant (`driver_id`, `truck_id`, `trailer_reg` only) plus a row
   policy, without weakening append-only on financial fields.
2. **0002_transactions_truck_driver_free_text.sql** — adds
   `transactions.truck_text` / `driver_text`. Truck/driver on an operation
   is free text with Fleet-match fallback (sets `truck_id`/`driver_id` when
   it matches; keeps free text as-is when it doesn't). No auto-creation of
   Fleet rows from unmatched text.
3. **0003_editable_records_and_audit.sql** — adds `transactions.unit_rate`
   (freezes the rate applied at entry time, so editing litres later doesn't
   reprice at today's rate). Replaces the 0001 narrow UPDATE grant with a
   fuller one covering `transactions`, `routes`, `trucks`, `drivers` — still
   permanently excluding `type`, `entered_by`, `voids_id`, `voids_type`,
   `id`, `created_at` on `transactions`. Adds `current_user_role()` helper,
   `audit_log` table (trigger-written only, SECURITY DEFINER, not yet
   surfaced in any UI), and audit triggers on all four editable tables.

## Reconciliation status (main handoff doc, Section 5)

Two of the seven open points are effectively **resolved by 1-3 above**, in
production, not just proposed:

- **Point 2** (trucks/drivers structured vs free text) → resolved as
  hybrid: free text with optional Fleet match, per migration 0002.
- **Point 5** (`trailer_reg`) → resolved as a plain free-text column
  directly on `transactions`, per migration 0001.

The other five points (company vs role, ledger vs `operations` table,
attachments structure, `routes` monthly-adjustment columns, and the
`user_permissions` catalog) are still open — see the main handoff doc.

## New gap found during frontend spec work (16/08/2026, not one of the original 7)

**`transactions` has no `SELECT` RLS policy at all** — confirmed by reading
0001-0003 directly: none of them enables RLS on `transactions` or creates a
`FOR SELECT` policy (only `audit_log` has RLS enabled, in 0003). Today, any
`authenticated` user can read every row regardless of `entered_by`.

This was fine for the Antigo dashboard (2 Admin accounts, one per company,
that are meant to see each other's side for the shared ledger to make
sense), but breaks once Month 1 introduces regular Users per company — a
Bankers User should never see Fuellink's diesel-sale rows and vice versa.
The two new frontend screens (`operations-fuellink` / `operations-bankers`,
see [docs/ROADMAP_FRONTEND.md](../../docs/ROADMAP_FRONTEND.md) Section 7)
depend on this being fixed first: **migration `0004` needs to add
`ALTER TABLE transactions ENABLE ROW LEVEL SECURITY` + a `FOR SELECT`
policy scoped to `entered_by = current_user_role()`**, alongside the
`user_permissions` work already planned for that migration (see
[docs/ROADMAP_BACKEND.md](../../docs/ROADMAP_BACKEND.md) Section 3, Month 1).

The future Ledger de Compensação screen still needs to see both companies'
rows to compute the net balance — that has to go through a separate path
(a `SECURITY DEFINER` view or a privileged PHP endpoint), not the same
company-scoped `SELECT` policy. Not designed yet; revisit when that screen
is speced.
