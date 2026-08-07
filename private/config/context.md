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
- `SUPABASE_JWT_MODEL` — `jwks` or `legacy_hs256`. Must be confirmed against
  the client's Supabase panel (Settings → API → JWT Keys) before
  `AuthMiddleware.php` is written. Default assumption is JWKS (asymmetric)
  per the main handoff doc; do not assume without checking.
- `SUPABASE_JWT_SECRET` — only needed if the project turns out to still be
  on the legacy HS256 model.

## Notes

- No PHP backend exists yet (see [private/app/Core/context.md](../app/Core/context.md)).
  The current frontend (`Antigo dashboard/`) talks to Supabase directly with
  the public anon key — that pattern is correct for unprivileged reads and
  should continue; this config directory only matters once privileged
  PHP endpoints are written (user creation, PDF generation, etc.).
