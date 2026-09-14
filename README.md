# Fuellink & Bankers Tankers Management Platform

Ref. PFB2607 · client: RWENDO SERVIÇOS LDA (Fuellink) + Bankers Tankers (Pty) Ltd
· developer: Lomavi Industrie, SU, LDA

Start here: [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) — the full
handoff doc (business model, contract terms, real DB schema, open
reconciliation points, stack, folder layout, UI/UX principles, screen
decisions).

Then: [docs/PROPOSTA_DESENVOLVIMENTO.md](docs/PROPOSTA_DESENVOLVIMENTO.md) —
the month-by-month technical execution plan, with all 7 open architecture
points resolved (or flagged for client sign-off) and each contract module
broken into concrete DB/PHP/JS deliverables.

Backend detail: [docs/ROADMAP_BACKEND.md](docs/ROADMAP_BACKEND.md) — the
server-side roadmap (PHP layers, DB migrations, API route map) with a
Foundation phase and a per-module work structure + definition of done.

Frontend detail: [docs/ROADMAP_FRONTEND.md](docs/ROADMAP_FRONTEND.md) and
[docs/API_CONTRACT.md](docs/API_CONTRACT.md) — the latter is the actionable
request/response contract (login, `GET /api/me`, operations CRUD, search,
filters, KPIs) for whoever builds the frontend.

Frontend detail: [docs/ROADMAP_FRONTEND.md](docs/ROADMAP_FRONTEND.md) — the
client-side roadmap (folder structure, design system, what to port from the
old dashboard, permission catalog, screen inventory) for whoever builds
`public_html/`.

Frontend Phase 1 hand-off:
[docs/ESPECIFICACAO_FASE1_FRONTEND.md](docs/ESPECIFICACAO_FASE1_FRONTEND.md) —
the actionable report for the frontend engineer building Login, Dashboard,
Operações Fuellink, Operações Bankers and Detalhe da Operação: what must
exist on each screen, not implementation detail.

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
