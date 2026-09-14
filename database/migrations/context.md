# database/migrations

SQL run manually against the client's real, already-in-production Supabase
project (see main handoff doc, Section 3). This is not a fresh schema —
**before writing any new migration, check the actual current schema first**,
never assume a table/column doesn't exist just because it's not in the main
handoff doc's Section 3 snapshot (that snapshot predates 0001-0003 below).

**No new migrations get created for changes that are already live** — if the
schema already has something, document it here instead of re-migrating it.

## Applied (confirmed against production)

0001-0003 are confirmed applied: the live dashboard
(`Antigo dashboard/fuellink-dashboard/index.html`) actively reads/writes
`truck_text`, `driver_text`, `trailer_reg`, `unit_rate`, and queries
`audit_log` — none of that works unless 0001-0003 already ran. 0004 is
confirmed applied as of 2026-08-24 — a real logged-in `GET /api/me` for
`waseem@bakers.co.za` returned `is_admin`/`role` correctly from the new
`user_roles` columns, and (after the permission seed below also ran)
`permissions: ["operations.create","operations.edit","operations.void"]`.

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
4. **0004_user_roles_permissions_and_transactions_rls.sql** (20/08/2026,
   confirmed applied 2026-08-24) — extends `user_roles` (`is_admin`,
   `full_name`, `phone`, `is_active`, `created_by`, `created_at`; the 2 real
   accounts become Admins); creates `user_permissions` (own-row `SELECT`
   only, writes always privileged via `PermissionController`); redefines
   `current_user_role()` to also require `is_active` (so deactivation
   immediately blocks every RLS policy that uses it, including the ones
   from 0003, with no other policy touched); adds `current_user_is_admin()`;
   enables RLS on `transactions` with a `SELECT` policy scoped to
   `entered_by = current_user_role()` **and** a matching `INSERT` policy
   (`WITH CHECK entered_by = current_user_role()`) — the `INSERT` policy
   isn't optional here: enabling RLS with only a `SELECT` policy would have
   silently broken every existing "Add transaction"/"Void" insert, and it
   closes a real spoofing gap where `entered_by` was previously just
   whatever the client sent.

## Written, not yet run against production

5. **0005_fix_log_audit_for_user_roles.sql** (2026-08-24) — bug fix, found
   while testing the new `PATCH /api/users/{id}` endpoint: `log_audit()`
   (0003) hardcoded `NEW.id::text`, which works for `transactions`/`routes`/
   `trucks`/`drivers` (all have an `id` column) but not `user_roles` (key is
   `user_id`, no `id` column at all) — every UPDATE against `user_roles`
   fails with `Supabase error (400): record "new" has no field "id"`,
   confirmed live. Nothing ever UPDATEd `user_roles` before this endpoint
   existed, so the `audit_user_roles` trigger (0004) never actually fired
   successfully until now. Fix reads the id out of the already-computed
   `new_json` (`COALESCE(new_json ->> 'id', new_json ->> 'user_id')`)
   instead of referencing `NEW.id` directly, so it degrades gracefully for
   any future audited table with a differently-named key too. **Needs to be
   run manually in the Supabase SQL editor before `PATCH /api/users/{id}`
   (or any other UPDATE to `user_roles`) is usable.**

## Permission seed for the 2 existing accounts — confirmed applied 2026-08-24

Not a schema migration (no `ALTER`/`CREATE`) — a one-time data seed, needed
once `0004` has run, before `OperationController` (Month 2,
`private/app/Controllers/OperationController.php`) is usable in practice.
Confirmed applied 2026-08-24 — a real `GET /api/me` now returns
`permissions: ["operations.create","operations.edit","operations.void"]`
for `waseem@bakers.co.za`. Left here in case it ever needs re-running
against a 3rd account added outside the (still unbuilt) `PermissionController`.
`AuthMiddleware::requirePermission()` checks exact `user_permissions` rows,
deliberately never `is_admin` alone (Regra de ouro #2,
[docs/ROADMAP_BACKEND.md](../../docs/ROADMAP_BACKEND.md) Section 0) — so
with `user_permissions` empty, both real accounts get 403 on every
operation, even though `0004` marks them `is_admin=true`. `PermissionController`
(Month 1, grant/revoke via the app) doesn't exist yet — this is the stopgap
until it does, decided with the user 2026-08-21 instead of building
`PermissionController` first.

**Run manually in the Supabase SQL editor, after `0004`** (Claude never runs
this — no staging project exists, everything is production, see
[[project-status]] in memory):

```sql
insert into user_permissions (user_id, permission, granted, granted_by)
select user_id, perm, true, user_id
from user_roles, unnest(array['operations.create','operations.edit','operations.void']) as perm
on conflict (user_id, permission) do nothing;
```

### Addendum (2026-08-27) — `operations.upload_delivery_proof`, not yet run

`OperationController::attachProof()` (Bankers delivery-tracking proof
uploads, migration `0008`) gates on `operations.upload_delivery_proof`,
already in the catalog (`docs/ROADMAP_FRONTEND.md` Section 6, "Bankers
(M4)") but never seeded — the original seed above only covered
create/edit/void. Same `on conflict do nothing`, safe to run any number of
times:

```sql
insert into user_permissions (user_id, permission, granted, granted_by)
select user_id, 'operations.upload_delivery_proof', true, user_id
from user_roles
on conflict (user_id, permission) do nothing;
```

## Reconciliation status (main handoff doc, Section 5)

Four of the seven open points are now resolved in production:

- **Point 1** (company vs role) → resolved by migration 0004: extends
  `user_roles` in place, no parallel `profiles` table.
- **Point 2** (trucks/drivers structured vs free text) → resolved as
  hybrid: free text with optional Fleet match, per migration 0002.
- **Point 5** (`trailer_reg`) → resolved as a plain free-text column
  directly on `transactions`, per migration 0001.
- **Point 7** (`user_permissions` catalog) → resolved by migration 0004,
  as originally designed (free-text permission codes, no rigid `CHECK`).

The other three points (ledger vs `operations` table, attachments
structure, `routes` monthly-adjustment columns) are still open — see the
main handoff doc.

## New gap found during frontend spec work (16/08/2026, not one of the original 7) — fixed by 0004, confirmed applied

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
depended on this being fixed first: migration `0004` added
`ALTER TABLE transactions ENABLE ROW LEVEL SECURITY` + a `FOR SELECT`
policy scoped to `entered_by = current_user_role()`, alongside the
`user_permissions` work (see [docs/ROADMAP_BACKEND.md](../../docs/ROADMAP_BACKEND.md)
Section 3, Month 1) — confirmed applied 2026-08-24.

The future Ledger de Compensação screen still needs to see both companies'
rows to compute the net balance — that has to go through a separate path
(a `SECURITY DEFINER` view or a privileged PHP endpoint), not the same
company-scoped `SELECT` policy. Not designed yet; revisit when that screen
is speced.

## Found live 2026-08-27: 0004's transactions RLS policies were neutralized by 2 forgotten legacy policies — 1 fixed (0007), 1 deliberately deferred

While testing the new `GET /api/operations/{id}` live, a `bakers`-role
test account could read `entered_by='fuellink'` rows **directly via
Supabase** despite `0004`'s `select_own_company_transactions` policy.
`SELECT policyname, cmd, roles, qual FROM pg_policies WHERE tablename =
'transactions'` revealed the real cause — 2 policies that predate
0001-0004 and were never dropped (not documented anywhere, confirming the
"never assume a table/column doesn't exist" warning at the top of this
file applies to policies too):

- **`"transactions insert"`** (INSERT, role `public`, `qual: null` — no
  `WITH CHECK` at all) — Postgres OR's same-command policies together, so
  this silently neutralized `insert_own_company_transactions`'s spoofing
  protection entirely; any authenticated caller could INSERT a transaction
  claiming any `entered_by`. **Fixed in `0007_drop_legacy_transactions_insert_policy.sql`**
  — safe, no functional dependency (every real write path already sends
  its own correct `entered_by`).
- **`"transactions readable"`** (SELECT, role `public`, `qual: auth.role()
  = 'authenticated'`) — same OR-neutralization, but for SELECT: any
  authenticated user can currently read every company's rows directly via
  Supabase, regardless of `select_own_company_transactions`. This is what
  the Antigo dashboard's shared Ledger view (both Admin accounts seeing
  each other's transactions) actually runs on — **not** a documented,
  designed mechanism, just this forgotten wide-open policy from before
  0001. **Deliberately NOT dropped yet** (user decision 2026-08-27): the
  privileged Net Position / Ledger de Compensação endpoint (see
  [docs/RELATORIO_REQUISITOS_FRONTEND.md](../../docs/RELATORIO_REQUISITOS_FRONTEND.md)
  Section 5.1) needs to exist first, or dropping this breaks the Antigo
  dashboard's Ledger for the 2 real admins today. Revisit once that
  endpoint ships.

**The PHP layer was never affected by either gap** —
`TransactionModel`'s methods all filter `entered_by` explicitly regardless
of RLS (confirmed live: the same `bakers` test account got a clean 404
from `GET /api/operations/{id}` for a `fuellink` operation id, even while
the direct-Supabase read leaked it). This only affects **direct Supabase
reads/writes** — but that's exactly the pattern the real frontend uses for
listing/searching operations
([docs/API_CONTRACT.md](../../docs/API_CONTRACT.md) Section 3), so the
SELECT gap is a real, currently-exploitable cross-company data leak for
any regular (non-Admin) user account once Month 1's user management ships
real non-admin accounts.

## Proof storage moved off Supabase Storage to local cPanel disk (2026-08-27)

Migration `0008` (Bankers delivery tracking, 3 proof upload slots) was
originally built against Supabase Storage — same bucket
(`delivery-notes`) the Antigo dashboard already used. Changed same day, at
the user's request: Supabase Storage bills per-GB stored + egress, which
adds up; the contract already runs this backend self-hosted on cPanel with
"sem infra nova" (Clause 6.2), and there's a fixed 10GB quota on that
hosting account to work within instead.

**Capacity math worked through with the user**: worst case (no
compression, every proof at the 5MB cap, 3 proofs/operation) = 15MB/op →
~680 operations before the 10GB quota fills. With image compression
(`App\Core\ImageCompressor`, resize to 1600px long edge + re-encode —
typically shrinks a phone photo to ~150-400KB) = ~750KB/op → ~13,000+
operations. PDFs aren't compressed (no tooling in this project for that)
so the real number depends on the order/loaded/offloaded proof mix in
practice.

**Worth doing periodically, not automated**: `du -sh private/storage/proofs`
on the cPanel server to see real consumption against the 10GB quota,
rather than relying on this estimate indefinitely.

See [private/app/Core/context.md](../../private/app/Core/context.md) for
`LocalFileStorage`/`ImageCompressor`/`Response::file()`, and
[private/app/Controllers/context.md](../../private/app/Controllers/context.md)
for `OperationController::attachProof()`/`downloadProof()`.
