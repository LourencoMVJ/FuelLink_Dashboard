# private/config

Real secrets for the PHP backend. Never reachable from the browser — this
directory sits outside `public_html/`, the cPanel document root.

## Files

- `env.php` — **git-ignored**, real values. Create it locally from
  `env.example.php`. Never commit it, never paste real values into chat/docs.
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

- No PHP backend exists yet (see [private/app/Core/context.md](../app/Core/context.md)).
  The current frontend (`Antigo dashboard/`) talks to Supabase directly with
  the public anon key — that pattern is correct for unprivileged reads and
  should continue; this config directory only matters once privileged
  PHP endpoints are written (user creation, PDF generation, etc.).
