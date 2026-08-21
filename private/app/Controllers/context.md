# private/app/Controllers

PHP request handlers for privileged operations only (things that need the
Supabase secret key, or logic that must never run in the browser — creating
users, generating sequentially-numbered PDFs, etc.). Nothing here yet — no
Month-1 work has started.

## Planned Controllers (see docs/ROADMAP_BACKEND.md for the full plan)

- `UserController` (M1), `PermissionController` (M1) — still not built; the
  permission gap this leaves open is bridged for now with a manual SQL seed,
  see [database/migrations/context.md](../../../database/migrations/context.md).
- `DocumentController` (M5)

## Existing Controllers

- `HealthController` — `GET /api/health`, smoke-tests the JWKS auth path.
- `MeController` — `GET /api/me`, the first call the frontend makes after
  Supabase login. Returns `AuthMiddleware::requireAuth()`'s profile plus
  `listPermissions()`. See [docs/API_CONTRACT.md](../../../docs/API_CONTRACT.md)
  Section 2 for the exact response shape.
- `OperationController` (2026-08-21) — `create()`/`edit()`/`void()`/`summary()`
  on `transactions`, both companies (`type` derived from the caller's
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
  the Ledger de Compensação screen is designed. **Not usable yet**: needs
  migration `0004` run + the permission seed (see
  [database/migrations/context.md](../../../database/migrations/context.md)).

## Fixed rules

- A Controller never talks to the Supabase REST API directly — always via a
  Model in [private/app/Models/](../Models/).
- Every Controller starts with `AuthMiddleware::requireAuth()`
  (see [private/app/Core/context.md](../Core/context.md)), and — once
  `user_permissions` exists — checks the exact permission needed before
  acting. Never gate on "is this user an admin?" alone.
- Unprivileged reads don't belong here — the frontend should query Supabase
  directly (see [public_html/assets/js/models/context.md](../../../public_html/assets/js/models/context.md)).
  Only add a Controller when there's a real reason the browser can't do it
  safely.
