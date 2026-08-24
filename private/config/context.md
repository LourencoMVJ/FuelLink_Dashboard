# private/config

Real secrets for the PHP backend. Never reachable from the browser — this
directory sits outside `public_html/`, the cPanel document root.

## Files

- `env.php` — **git-ignored**, real values. Create it locally from
  `env.example.php`. Never commit it, never paste real values into chat/docs.
  **Must be named exactly `env.php`** (a PHP file `Env::load()` `require`s
  and expects to `return [...]`), not `.env` (a mistake made once,
  2026-08-24 — that dotenv-style filename is a different convention this
  project doesn't use, and it silently wasn't covered by `.gitignore`
  either since only `private/config/env.php` was listed there; both
  `env.php` and `.env` are ignored now).
- `env.example.php` — checked in, placeholder values only, documents every
  variable this app expects.

## Expected variables (names only — see env.example.php for placeholders)

- `SUPABASE_URL` — the client's existing Supabase project URL
  (`https://vyhjninisvdlgbivwxuw.supabase.co`, already in use by the
  Antigo dashboard frontend — same project, do not create a new one).
- `SUPABASE_SECRET_KEY` — server-side key with elevated privileges, used
  only from PHP (Controllers/Models), never sent to the browser.
- `SUPABASE_JWT_MODEL` — **confirmed `jwks` (asymmetric)** as of 2026-08-11:
  the project's `/auth/v1/.well-known/jwks.json` serves an EC P-256 key with
  `alg=ES256`, and the client confirmed the asymmetric model. `AuthMiddleware`
  verifies via the JWKS public key; there is no shared HS256 secret.
- `SUPABASE_JWT_SECRET` — **not used** (would only apply to the legacy HS256
  model, which this project is not on). Leave empty.

## Notes

- The PHP backend now exists (`GET /api/health`/`/me`, `POST /api/operations*`,
  `POST /api/users`) and needs this file to boot at all — `Bootstrap::init()`
  fails with a generic 500 (deliberately no internals leaked) if it's
  missing or misnamed. The frontend (`Antigo dashboard/`, and eventually
  `shads_staging`) still talks to Supabase directly with the public anon
  key for unprivileged reads — that pattern is correct and continues
  alongside this, not replaced by it.
- Local XAMPP testing: no Apache vhost is needed —
  `Router::normalizedPath()` (2026-08-24) handles both a real cPanel
  deployment's URI shape and a plain `htdocs/<project>/public_html/api/...`
  checkout's. See [private/app/Core/context.md](../app/Core/context.md).
