# private/app/Core

Shared infrastructure used by every Controller/Model. Implemented (Foundation
phase, committed 2026-08-19).

## Files

- `Bootstrap.php` — `init()` sets up error/exception handlers (never echo
  internals to the client), ensures `private/storage/` exists, loads `Env`.
  Called once at the top of `public_html/api/index.php`.
- `Env.php` — loads `private/config/env.php`, fails fast if a required key
  is missing. `setForTesting()` exists only for PHPUnit.
- `SupabaseClientInterface` / `SupabaseClient` / `FakeSupabaseClient` — the
  testability seam. `SupabaseClient::forUser($jwt)` forwards the caller's
  own JWT (RLS applies); `::forService()` uses the secret key
  (`service_role`, bypasses RLS — reserve for genuinely privileged reads/
  writes, e.g. `AuthMiddleware`'s own role/permission lookups). Models
  receive whichever instance by constructor injection — never instantiate
  `SupabaseClient` directly inside a Model. `FakeSupabaseClient` is the
  in-memory double used by every unit test (see
  [docs/ROADMAP_BACKEND.md](../../../docs/ROADMAP_BACKEND.md) Section 7).
- `AuthMiddleware.php` — JWT verification is **confirmed asymmetric JWKS,
  ES256** (2026-08-11), cached in `private/storage/jwks-cache.json` (1h
  TTL). Three public methods, each with a pure/testable half kept separate
  from its side-effecting caller (same reason each time: `Response::error()`
  calls `exit()`, which would kill the PHPUnit process if invoked directly
  in a test):
  - `requireAuth()` → `verify()` (pure JWT check) — returns
    `{user_id, email, role, is_admin, full_name, phone}`. **Also enforces
    `is_active`** (query-side filter in `lookupProfile()`, since this
    client always runs in service mode and bypasses the RLS-level
    `is_active` check that migration `0004` added to `current_user_role()`)
    — a deactivated account gets the same 401 as one with no role at all,
    deliberately indistinguishable.
  - `requirePermission()` → `isGranted()` (pure decision over already-
    fetched rows).
  - `listPermissions()` → `extractPermissionCodes()` (pure row→code list).
- `Request.php` / `Response.php` — `Request::capture()` parses JSON body +
  query string. `Response::envelope()` is the pure builder (unit-tested);
  `json()`/`error()` are the side-effecting emitters (`http_response_code`
  + `exit`) that wrap it. Every `/api/*` response uses this envelope.
- `Router.php` — explicit route whitelist (`ROUTES` const) mapping
  `METHOD + regex path → Controller::method`. `build()` is the only place
  Controllers get constructed — add a new `match` arm there when adding a
  Controller, never let request input choose the class.

## Fixed rule

Anything added here must be generic — not tied to one table or one screen.
Table-specific or screen-specific logic belongs in Controllers/Models, not
Core.
