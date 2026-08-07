# Fuellink & Bankers Tankers Management Platform

Ref. PFB2607 · client: RWENDO SERVIÇOS LDA (Fuellink) + Bankers Tankers (Pty) Ltd
· developer: Lomavi Industrie, SU, LDA

Start here: [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) — the full
handoff doc (business model, contract terms, real DB schema, open
reconciliation points, stack, folder layout, UI/UX principles, screen
decisions).

## Current state

- `Antigo dashboard/fuellink-dashboard/index.html` — the existing
  production offset-ledger dashboard (single-file, talks to Supabase
  directly). This is real, live functionality — not a placeholder.
- `database/migrations/` — SQL already run against the live Supabase
  project. See [database/migrations/context.md](database/migrations/context.md)
  before writing new migrations; two of the seven open reconciliation
  points are already resolved here.
- `private/`, `public_html/` — MVC skeleton for the module work ahead
  (Month 1 onward). Each subdirectory has its own `context.md`.

## Working in this repo

Every directory under `private/` and `public_html/` has a `context.md` —
read the one for the folder you're touching before writing code. It links
back to [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) for anything
broader.
