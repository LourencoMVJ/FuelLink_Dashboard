# private/app/Core

Shared infrastructure used by every Controller/Model. Nothing here yet.

## Expected files

- `SupabaseClient.php` — thin HTTP wrapper around the Supabase REST API
  (using `SUPABASE_SECRET_KEY` from [private/config](../../config/context.md)).
  All Models call through this; no Model should shell out to `curl` on its
  own.
- `AuthMiddleware.php` — verifies the caller's Supabase JWT.
  **Confirm the JWT model (JWKS asymmetric vs legacy HS256) in the client's
  Supabase panel before writing this** — see
  [private/config/context.md](../../config/context.md). Do not assume.
- `Router.php` — dispatches `/api/*` requests to the right Controller.

## Fixed rule

Anything added here must be generic — not tied to one table or one screen.
Table-specific or screen-specific logic belongs in Controllers/Models, not
Core.
