# public_html/assets/js/core

Shared frontend infrastructure: auth guard, shared API client. Nothing here
yet as standalone modules — the current dashboard
(`Antigo dashboard/fuellink-dashboard/index.html`) has this logic inlined
in the single HTML file (see its `supabase.createClient(...)` call and the
`user_roles` lookup right after sign-in).

## Expected files

- `auth.js` — `requireSession()` / `requireAdmin()` (or equivalent). Every
  new screen calls this on load; don't reimplement inline per page like the
  Antigo dashboard does.

## Fixed rule

Session/token refresh is handled automatically by `supabase-js` — never
reimplement that by hand.
