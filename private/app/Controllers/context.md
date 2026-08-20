# private/app/Controllers

PHP request handlers for privileged operations only (things that need the
Supabase secret key, or logic that must never run in the browser — creating
users, generating sequentially-numbered PDFs, etc.). Nothing here yet — no
Month-1 work has started.

## Planned Controllers (see docs/ROADMAP_BACKEND.md for the full plan)

- `UserController` (M1), `PermissionController` (M1)
- `OperationController` (M2, extended M3/M4) — create/edit/void/summary, see
  [docs/API_CONTRACT.md](../../../docs/API_CONTRACT.md) Sections 4-7 for the
  request/response contract. List/search/filter never gets a Controller —
  it's a direct Supabase read, RLS-scoped (migration 0004).
- `DocumentController` (M5)

## Existing Controllers

- `HealthController` — `GET /api/health`, smoke-tests the JWKS auth path.
- `MeController` — `GET /api/me`, the first call the frontend makes after
  Supabase login. Returns `AuthMiddleware::requireAuth()`'s profile plus
  `listPermissions()`. See [docs/API_CONTRACT.md](../../../docs/API_CONTRACT.md)
  Section 2 for the exact response shape.

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
