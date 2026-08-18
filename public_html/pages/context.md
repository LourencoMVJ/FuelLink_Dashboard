# public_html/pages

One HTML file per screen. Nothing here yet in the new MVC structure — the
one existing screen (offset ledger dashboard) still lives at
`Antigo dashboard/fuellink-dashboard/index.html` (single-file, both companies'
views in one page, talks to Supabase directly). Migrating/splitting it into
this structure is part of upcoming module work, not done yet.

## Existing pages

- `login.html` — Tela de login moderna com design split-screen responsivo, tokens de design compartilhados e integração com o core de autenticação modular (`assets/js/core/auth.js`).


## Sidebar navigation decision

**Still open** (main handoff doc, Section 9). Not applied to any page yet.
Once decided, every page here should follow it consistently — note the
decision here when it lands.
