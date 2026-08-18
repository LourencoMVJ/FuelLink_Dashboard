# public_html/assets/js/core

Shared frontend infrastructure: auth guard, shared API client. Nothing here
yet as standalone modules — the current dashboard
(`Antigo dashboard/fuellink-dashboard/index.html`) has this logic inlined
in the single HTML file (see its `supabase.createClient(...)` call and the
`user_roles` lookup right after sign-in).

## Implemented files

- `auth.js` — Gerenciamento de sessão, autenticação (`signIn`, `signOut`, `getSession`) e resolução de papéis (`user_roles`).


## Fixed rule

Session/token refresh is handled automatically by `supabase-js` — never
reimplement that by hand.
