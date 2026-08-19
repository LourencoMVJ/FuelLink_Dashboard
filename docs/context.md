# docs

## proposal/

- `Lomavi_Proposta_Fuellink_Bankers_PT.pdf` — commercial proposal, PT,
  Ref. PFB2607, 2026-07-23.
- `Lomavi_Fuellink_Bankers_Proposal_EN.docx` — same proposal, EN.

## contract/

- `Lomavi_Development_Agreement_DRAFT.pdf` — Software Development and
  Maintenance Agreement, Ref. PFB2607, dated 25 July 2026. The copy on disk
  has blank signature lines (it's the reference/draft version). **Resolved
  (2026-08-11)**: the client holds the signed physical copy — the clauses
  are legally final; this PDF is just the reference text.
- Contract clause worth surfacing that isn't in the main handoff doc's
  summary: **Clause 1.3** makes the append-only auditability principle,
  strict file-type validation, HTTPS/TLS on all access points, and
  responsive desktop/mobile access **contractual requirements** (via
  Section 4 of the Proposal, Annex A) — not just a design preference. Keep
  this in mind whenever editable-record work (like the 0003 migration)
  touches the append-only model.
- Client's registered address (from the contract): Av. Mao Tse Tung No.
  1386, Maputo, Mozambique.

## proposal/

- `Lomavi_Proposta_Fuellink_Bankers_PT.pdf` — commercial proposal, PT,
  Ref. PFB2607, 2026-07-23.
- `Lomavi_Fuellink_Bankers_Proposal_EN.docx` — same proposal, EN.
- **Not yet read in full**: Section 4 (functional/non-functional
  requirements referenced by contract Clause 1.3) hasn't been extracted
  into any context.md yet — worth doing before Month 3 (proof-of-operation
  upload + testing), since strict file-type validation is named there.

Full contract terms (delivery schedule, fees, acceptance windows, IP
transfer, warranty) are summarized in the main handoff doc — read that
before re-deriving terms from the PDF. Treat this file as the correction
layer where what's actually on disk differs from that summary.

## development plan

- [PROPOSTA_DESENVOLVIMENTO.md](PROPOSTA_DESENVOLVIMENTO.md) — month-by-month
  technical execution plan; resolves the 7 open reconciliation points from
  `PROJECT_CONTEXT.md` Section 5 and breaks each contract module into
  concrete DB/PHP/JS work. Read this before starting any module's code.
- [ROADMAP_BACKEND.md](ROADMAP_BACKEND.md) — server-side roadmap (PHP layers,
  DB migrations, API route map, risk-based TDD strategy). Read this before
  touching `private/` or `public_html/api/`.
- [ROADMAP_FRONTEND.md](ROADMAP_FRONTEND.md) — client-side roadmap (folder
  structure, design system, permission catalog, screen inventory, what to
  port from the old dashboard vs. rebuild). Read this before touching
  `public_html/pages/` or `public_html/assets/`.
- [ESPECIFICACAO_FASE1_FRONTEND.md](ESPECIFICACAO_FASE1_FRONTEND.md) — the
  actionable hand-off report for whoever builds Phase 1 (Login, Dashboard,
  Operações Fuellink, Operações Bankers, Detalhe da Operação): what must
  exist and how it behaves on each screen, distilled from
  `ROADMAP_FRONTEND.md`. Start here if you're the one building these
  screens; go to `ROADMAP_FRONTEND.md` only for broader rationale.

## `../referencias visuais/`

Externally-generated UI mockups (not authored in this repo's sessions) —
currently one login screen mockup
(`deepseek_html_20260808_481ef9.html`). It conflicts with the login design
already decided in `PROJECT_CONTEXT.md` Section 9 (adds an explicit
company selector, uses a generic Bootstrap palette instead of the real
brand colors, misspells "Bankers" as "Bonkers") — see
`PROPOSTA_DESENVOLVIMENTO.md` Section 3 for the full comparison. Treat
anything in this folder as a reference/inspiration input requiring
reconciliation, never as an already-approved spec.
