# private/app/Core

Shared infrastructure used by every Controller/Model. Implemented (Foundation
phase, committed 2026-08-19).

## Files

- `Bootstrap.php` — `init()` sets up error/exception handlers (never echo
  internals to the client), ensures `private/storage/` exists, loads `Env`.
  Called once at the top of `public_html/api/index.php`.
- `Env.php` — loads `private/config/env.php`, fails fast if a required key
  is missing. `setForTesting()` exists only for PHPUnit.
- `SupabaseClient::createAuthUser()` (2026-08-23) — Auth Admin API
  (`/auth/v1/admin/users`, a different subsystem from `/rest/v1/`), used by
  `UserController::create()`. Only works with the service_role secret key
  as Authorization — always build via `forService()`, never `forUser()`
  (not enforced by the type system, just convention + `Router::build()`).
- `SupabaseClient::throwApiError()` (2026-08-24) — extracts the message
  from `message`/`msg`/`error_description`/`error`, in that order. GoTrue
  (Auth, including the Admin API) uses `msg`/`error_description`;
  PostgREST uses `message`/`error`. Confirmed live: a real 422 from
  `createAuthUser()` surfaced as "Unknown error" until `msg` was added —
  any caller catching the `RuntimeException` (e.g.
  `UserController::create()`'s forwarded error message) depends on this
  actually finding Supabase's real reason.
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
  - `bearerToken()` is `public static` (2026-08-21, reads only `$_SERVER`) —
    `Router::build()` calls it to construct `SupabaseClient::forUser()` for
    Controllers whose Models must run under the caller's own RLS (see
    `OperationController`'s factory in `Router.php`).
- `Request.php` / `Response.php` — `Request::capture()` parses JSON body +
  query string. `Response::envelope()` is the pure builder (unit-tested);
  `json()`/`error()` are the side-effecting emitters (`http_response_code`
  + `exit`) that wrap it. Every `/api/*` response uses this envelope.
- `Router.php` — explicit route whitelist (`ROUTES` const) mapping
  `METHOD + regex path → Controller::method`. `normalizedPath()` strips
  through the **last** `/api/` segment in the URI (2026-08-24), not just a
  literal leading `/api/` — needed because a plain XAMPP `htdocs` checkout
  puts a project-folder prefix in front
  (`/FuelLink_Dashboard/public_html/api/health`) that a real cPanel
  deployment never has (`public_html` is the actual document root there,
  so the URI is already exactly `/api/health`). Both shapes now route
  correctly without needing a local Apache vhost. `build()` is the only place
  Controllers get constructed — add a new `match` arm there when adding a
  Controller, never let request input choose the class. A route whose path
  is a fixed literal (e.g. `operations/summary`) must be listed **before**
  any `{id}`-capturing route on the same path prefix, or the literal would
  never be reached — the id-pattern route would match it first with `id`
  bound to the literal text.
- `SupabaseClientInterface::get()`'s `$query` values can be a single
  filter string or a `list<string>` (2026-08-21, added for
  `TransactionModel::listActiveInRange()`'s date range) — PostgREST
  expresses two constraints on the same column as a repeated query param
  (`?date=gte.X&date=lte.Y`), which a PHP associative array can't hold
  under one key. `SupabaseClient::queryString()` builds the query string by
  hand (not `http_build_query()`) to emit the repeated param; `FakeSupabaseClient`
  matches every filter in the list, and now understands `gte.`/`lte.`/`gt.`/
  `lt.` (string comparison — fine for `YYYY-MM-DD` dates, not fine for
  numeric magnitude comparisons if this is ever reused for a non-date
  column) alongside `eq.`.

## Fixed rule

Anything added here must be generic — not tied to one table or one screen.
Table-specific or screen-specific logic belongs in Controllers/Models, not
Core.
