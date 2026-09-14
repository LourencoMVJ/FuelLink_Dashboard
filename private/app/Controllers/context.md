# private/app/Controllers

PHP request handlers for privileged operations only (things that need the
Supabase secret key, or logic that must never run in the browser — creating
users, generating sequentially-numbered PDFs, etc.). Nothing here yet — no
Month-1 work has started.

## Planned Controllers (see docs/ROADMAP_BACKEND.md for the full plan)

- `PermissionController` (M1) — still not built; the permission gap this
  leaves open is bridged for now with a manual SQL seed, see
  [database/migrations/context.md](../../../database/migrations/context.md).
- `DocumentController` (M5)

## Existing Controllers

- `HealthController` — `GET /api/health`, smoke-tests the JWKS auth path.
- `MeController` — `GET /api/me`, the first call the frontend makes after
  Supabase login. Returns `AuthMiddleware::requireAuth()`'s profile plus
  `listPermissions()`. See [docs/API_CONTRACT.md](../../../docs/API_CONTRACT.md)
  Section 2 for the exact response shape.
- `UserController` (2026-08-23/24, partial — `create()` + `update()`) —
  `POST /api/users`, built to back a standalone "create user" form ahead of
  putting the dashboard in production. Gated on `is_admin` directly (not a
  permission code — there isn't one for user management in the catalog).
  Uses the new `SupabaseClient::createAuthUser()` (Auth Admin API,
  `/auth/v1/admin/users` — a different subsystem from `/rest/v1/`, always
  called via `SupabaseClient::forService()`, never `forUser()`) to create
  the Supabase Auth account, then `UserRoleModel::create()` to insert the
  matching `user_roles` row. `is_admin` is accepted directly from the
  request body — any admin can create another admin this way (briefly
  restricted after a security review, reverted 2026-08-24 at the user's
  explicit request: a 2-3 person trusted team, manual SQL promotion was
  worse than the accepted risk).
  `PATCH /api/users/{id}` (`update()`, 2026-08-24) — partial update, only
  the 4 columns migration 0004 actually granted UPDATE on:
  `full_name`/`phone`/`is_active`/`is_admin` (never `role` — which company
  an account belongs to shouldn't change post-creation — and never
  email/password, a separate Auth Admin API concern not built here).
  `buildUpdatePayload()` uses `array_key_exists()`, not `isset()`/`??`, so
  an explicit `null` clears a field instead of being indistinguishable from
  "omitted". Confirmed working live 2026-08-24 (after migration `0005`
  fixed a pre-existing `log_audit()` bug this endpoint's first real UPDATE
  surfaced — see `database/migrations/context.md`).
  `list()`/`deactivate()` from the original M1 plan are **not built** —
  add them when actually needed.
- `PasswordResetController` (2026-08-24) — `POST /api/forgot-password`, the
  **one Controller with no `AuthMiddleware::requireAuth()` call** (see
  Fixed rules below — the caller can't authenticate, that's the whole
  point). Deliberately not self-service Supabase Auth reset (overrides the
  16/08/2026 decision in `docs/API_CONTRACT.md` Section 1, at the user's
  explicit request): logs a pending row in `password_reset_requests`
  (migration 0006) for an admin to review manually, instead of emailing the
  account holder directly. No email server is configured yet —
  `notifyAdmins()` is an explicit no-op stub marking where that plugs in
  later. Response is identical regardless of whether the email is
  well-formed or matches a real account — never reveals which emails are
  registered, and the insert is wrapped in try/catch for the same reason
  (a DB failure must still return the same 202, not a 500 that would leak
  something went wrong server-side). A 1-hour cooldown per email
  (`PasswordResetRequestModel::hasPendingRequestSince()`) skips creating a
  duplicate row without changing the response — the only spam mitigation
  here, since no rate-limiting infrastructure exists anywhere in this app
  (security review, 2026-08-24 — accepted as proportionate for a 2-3
  person internal tool, not full IP-based rate limiting).
- `LedgerController` (2026-08-27) — `GET /api/ledger`, Net Position /
  Ledger de Compensação. Admin-gated directly on `is_admin` (same
  reasoning as `UserController` — no finer permission is actually used).
  `TransactionModel::listAll()` (no `entered_by` filter, unlike every other
  method on that Model — deliberately privileged, only ever call it from
  here) returns both companies' rows via a `SupabaseClient::forService()`
  instance built in `Router.php`, bypassing RLS entirely by design — the
  `is_admin` check in this Controller is the only gate, so never call
  `listAll()` from anywhere that hasn't already checked it. Built as the
  intended replacement for a forgotten pre-0001 RLS policy
  (`"transactions readable"`) found live 2026-08-27 that let ANY
  authenticated user read every company's transactions directly via
  Supabase — see `database/migrations/context.md`; that policy stays until
  this endpoint (and whatever consumes it) fully replaces the need for it.
  `buildLedger()` (pure, static) sorts chronologically, accumulates a
  running balance across **both companies combined** (that's the actual
  net position), then splits rows into `fuellink`/`bakers` lists for
  display — includes void rows (their own `balance_delta` is what nets
  them against the original), unlike `summary()`'s KPIs which exclude them.
- `OperationController` (2026-08-21) — `create()`/`edit()`/`void()`/`summary()`/
  `show()` (`show()` added 2026-08-27 — `GET /api/operations/{id}`, detail
  view, `requireAuth()` only, no `operations.*` permission — matches
  list/search/filter being unprivileged elsewhere; 404 for both a missing
  id and another company's id, via `TransactionModel::findById()`'s
  existing RLS + `entered_by` scoping, never a 403 that would confirm the
  id exists) on `transactions`, both companies (`type` derived from the caller's
  `role`, never from the request — `fuellink`→`diesel`, `bakers`→`logistics`).
  Direct port of the old dashboard's `computeTxFinancials()`/`resolveTruck()`/
  `resolveDriver()` (`Antigo dashboard/fuellink-dashboard/index.html`), kept
  as pure static methods (`computeFinancials()`, `routeTotalRate()`,
  `resolveTruck()`, `resolveDriver()`, `buildVoidPayload()`) — same
  split-for-testability pattern as `AuthMiddleware`, tested in
  `tests/Unit/Controllers/OperationControllerTest.php`. Its Models run
  under `SupabaseClient::forUser()` (the caller's own JWT), so migration
  `0004`'s RLS is a second enforcement layer under the explicit
  `operations.create`/`.edit`/`.void` permission checks. `type='settlement'`
  is explicitly out of scope — stays on the old direct-Supabase path until
  the Ledger de Compensação screen is designed. Confirmed live 2026-08-24
  (migration `0004` + the permission seed both ran — see
  [database/migrations/context.md](../../../database/migrations/context.md)).

  **Bankers delivery tracking, added 2026-08-27** (migration `0008`,
  user request): `create()`/`edit()` now also read/persist
  `order_amount`/`loaded_amount`/`offloaded_amount` (litres, all optional,
  logistics-only) via the shared `readDeliveryTracking()` helper, which
  also computes and stores `loaded_offloaded_diff`
  (`loaded_amount - offloaded_amount`) and `delivery_value`
  (`offloaded_amount * unit_rate` — the operation's own frozen rate, not a
  separate price) — both null until their inputs exist, per
  `computeDeliveryTracking()` (pure, tested). These 3 quantities are
  genuinely new columns, independent of the pre-existing `litres` field
  (which keeps driving `amount`/`balance_delta` exactly as before).

  `attachProof(id, field)` — `POST /api/operations/{id}/proof/{order|loaded|offloaded}`,
  multipart/form-data (field name `proof`), gated on
  `operations.upload_delivery_proof` (catalogued but not seeded before
  now — see `database/migrations/context.md`). The first file-upload
  endpoint in this codebase: skips `Request::capture()` entirely (a
  multipart body has no JSON to parse) via the new
  `Request::uploadedFile()`, validates with `App\Core\FileValidator`
  (extension whitelist + real content-sniffed MIME type, never the
  client-supplied one + size ceiling + the two must agree — Contract
  Clause 1.3's "accept= doesn't count as strict"), recompresses photos via
  `App\Core\ImageCompressor`, then sanitizes the client-supplied filename
  (`sanitizeFilename()`, pure, tested) before it becomes part of the
  storage path — the original, unsanitized name is still kept verbatim in
  `*_proof_name` for display. Stores via `App\Core\LocalFileStorage`
  (cPanel filesystem, `private/storage/proofs/`) — **not** Supabase
  Storage, changed 2026-08-27 same day it was first built, at the user's
  request over storage cost (see `database/migrations/context.md`). No
  `SupabaseClientInterface` needed for this anymore, so the Controller's
  constructor is back to 7 params.

  `downloadProof(id, field)` — `GET /api/operations/{id}/proof/{order|loaded|offloaded}`
  (2026-08-27), streams the stored file back via `Response::file()`.
  `requireAuth()` only, no permission (matches `show()` — viewing your own
  company's data isn't gated), still company-scoped through
  `findById()`'s existing `entered_by` filter. Re-sniffs the MIME type
  from the stored bytes at serve time (`LocalFileStorage::resolvedPathIfExists()`
  + `FileValidator::sniffMimeType()`) rather than trusting anything from
  upload time. This is the local-storage replacement for what a Supabase
  `createSignedUrl()` would have given the frontend.

  Expands the M3 roadmap's original "1 shared proof file, closed decision"
  to 3 independent proof slots, at the user's explicit request.

## Fixed rules

- A Controller never talks to the Supabase REST API directly — always via a
  Model in [private/app/Models/](../Models/).
- Every Controller starts with `AuthMiddleware::requireAuth()`
  (see [private/app/Core/context.md](../Core/context.md)), and — once
  `user_permissions` exists — checks the exact permission needed before
  acting. Never gate on "is this user an admin?" alone (except `UserController`
  itself, see its entry below — deliberate, no finer permission exists for
  user management). **One deliberate exception to `requireAuth()` itself**:
  `PasswordResetController` (below) — the entire point of "forgot password"
  is that the caller can't authenticate.
- Unprivileged reads don't belong here — the frontend should query Supabase
  directly (see [public_html/assets/js/models/context.md](../../../public_html/assets/js/models/context.md)).
  Only add a Controller when there's a real reason the browser can't do it
  safely.
