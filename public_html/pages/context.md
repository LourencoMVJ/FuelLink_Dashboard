# public_html/pages

One HTML file per screen. Nothing here yet in the new MVC structure — the
one existing screen (offset ledger dashboard) still lives at
`Antigo dashboard/fuellink-dashboard/index.html` (single-file, both companies'
views in one page, talks to Supabase directly). Migrating/splitting it into
this structure is part of upcoming module work, not done yet.

## Existing pages

_(none yet — see `Antigo dashboard/fuellink-dashboard/index.html` for the
current production screen)_

## Planned pages (spec closed 2026-08-16, none built yet)

Full field-level spec for each in [docs/ROADMAP_FRONTEND.md](../../docs/ROADMAP_FRONTEND.md) Section 7:

- `login.html` — exclusive layout, company selector, self-service forgot-password.
- `operations-fuellink.html` and `operations-bankers.html` — **two separate,
  mutually isolated pages**, not one shared page. A Bankers user must never
  see Fuellink's `diesel` rows (sale value, diesel price) and vice versa;
  only the future Ledger de Compensação page crosses both companies. Blocked
  on a `transactions` RLS `SELECT` policy that doesn't exist yet — see
  [database/migrations/context.md](../../database/migrations/context.md).

## Sidebar navigation decision

**Decided (2026-08-11)**: one single global sidebar, shared by every
internal page, whose accent color switches with the authenticated user's
company (Fuellink `#2a78d6` / Bakers `#eb6834`). Build it once as a reusable
component in `../assets/js/core/` with a CSS accent variable per company,
and apply it from the first Month-1 page onward. The login screen keeps its
own exclusive layout (with company selector) and does not use this sidebar.
