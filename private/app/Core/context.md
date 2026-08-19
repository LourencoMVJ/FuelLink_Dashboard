# private/app/Core

Shared infrastructure used by every Controller/Model. Nothing here yet.

## Expected files

- `SupabaseClient.php` — thin HTTP wrapper around the Supabase REST API
  (using `SUPABASE_SECRET_KEY` from [private/config](../../config/context.md)).
  All Models call through this; no Model should shell out to `curl` on its
  own. **Must be an interface (`SupabaseClientInterface`) with a real impl
  and a `FakeSupabaseClient`**, and Models receive it by constructor
  injection — this is the testability precondition for the risk-based TDD
  strategy (see [docs/ROADMAP_BACKEND.md](../../../docs/ROADMAP_BACKEND.md)
  Section 7). Tests never hit production Supabase.
- `AuthMiddleware.php` — verifies the caller's Supabase JWT. **Model
  confirmed (2026-08-11): asymmetric JWKS, ES256** — verify against the
  public key from `/auth/v1/.well-known/jwks.json` (cache the JWKS; refresh
  on unknown `kid`). No shared HS256 secret. See
  [private/config/context.md](../../config/context.md).
- `Router.php` — dispatches `/api/*` requests to the right Controller.

## Fixed rule

Anything added here must be generic — not tied to one table or one screen.
Table-specific or screen-specific logic belongs in Controllers/Models, not
Core.
