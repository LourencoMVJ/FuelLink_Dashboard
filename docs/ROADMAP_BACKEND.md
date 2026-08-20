# Roadmap do Backend — Sistema Completo

**Fuellink & Bankers Tankers Management Platform · Ref. PFB2607**

> Estrutura de trabalho e roadmap **do backend** (camada PHP privilegiada +
> base de dados Supabase + API `/api/*`), mês a mês. Complementa
> [PROPOSTA_DESENVOLVIMENTO.md](PROPOSTA_DESENVOLVIMENTO.md) (visão de
> produto/entregáveis) com o detalhe de engenharia de servidor. O frontend
> (páginas/views) tem o seu próprio caminho; aqui só se referem os contratos
> de API que o frontend consome.
>
> Regra de ouro (Secção 6 do handoff): **leituras simples → Supabase directo
> via RLS; operações privilegiadas → sempre pela API PHP**. Este roadmap é a
> lista do que tem de existir do lado privilegiado.

---

## 0. Princípios transversais (valem em TODOS os meses)

Aplicar a cada Controller/Model/rota, sem excepção:

1. **Auth primeiro** — todo o Controller começa por `AuthMiddleware::requireAuth()`.
2. **Permissão exacta, não "é admin?"** — operações sensíveis validam a
   permissão precisa em `user_permissions` (`requirePermission('operations.void')`),
   nunca só o `is_admin`.
3. **Envelope de resposta único** — toda a resposta JSON segue
   `{ success, data, error, meta }` (ver `Core/Response.php`).
4. **Append-only + auditoria** — nunca DELETE/UPDATE destrutivo em dados
   financeiros; reversões via `void`; toda a tabela nova herda o trigger
   `log_audit()`.
5. **Validação na fronteira** — validar e sanitizar todo o input antes de
   tocar num Model; falhar cedo com mensagem clara.
6. **Cálculo financeiro no servidor** — a partir do Mês 2, `amount` /
   `balance_delta` / `unit_rate` são calculados em PHP, não recebidos do
   cliente (evita adulteração).
7. **Segredos só no servidor** — a chave `sb_secret_...` nunca sai de
   `private/config/env.php`; nunca chega ao browser nem ao repo.
8. **Erros não vazam dados** — mensagem amigável para o cliente, contexto
   detalhado só no log do servidor.
9. **TDD baseado em risco** — as unidades de risco (cálculo financeiro,
   verificação de permissão, validação estrita de ficheiro, numeração
   sequencial, resolução truck/driver, claims do JWT) escrevem-se
   test-first (RED→GREEN→REFACTOR). Controllers/`SupabaseClient` cobrem-se
   por integração contra **staging, nunca produção**. Ver Secção 7.

---

## 1. Camadas e responsabilidades

```
public_html/api/            → porta fina: recebe pedido, despacha, devolve JSON
        │
private/app/Core/           → infra genérica, sem lógica de tabela/ecrã
        ├── Bootstrap.php      carrega env, regista error/exception handlers
        ├── Env.php            lê private/config/env.php
        ├── SupabaseClient.php wrapper HTTP (REST/PostgREST, Auth Admin, Storage)
        ├── AuthMiddleware.php verificação JWKS (ES256) + requirePermission()
        ├── Router.php         mapeia /api/<recurso>/<acção> → Controller
        ├── Request.php        parse + validação de input
        └── Response.php       envelope JSON { success, data, error, meta }
        │
private/app/Models/         → 1 por tabela; única camada que fala com Supabase
        │                       (recebe o SupabaseClient por injecção — DI)
private/app/Controllers/    → orquestra Models, aplica auth/permissão, valida
        │
tests/                      → PHPUnit
        ├── Unit/              lógica pura de risco (sem rede) — test-first
        └── Integration/       Controllers/Client contra Supabase de STAGING
```

**SupabaseClient — interface + duas implementações (para testabilidade):**
- `SupabaseClientInterface` — o contrato que os Models conhecem.
- `SupabaseClient` (real) — dois modos: **utilizador** (reencaminha o JWT do
  chamador → respeita RLS) e **serviço** (`sb_secret_...` → ignora RLS, só
  para o estritamente privilegiado: criar utilizador, numeração de
  documentos). Usar o modo serviço o mínimo possível.
- `FakeSupabaseClient` (testes) — em memória; os testes unitários nunca
  tocam em produção. **Os Models recebem o client por injecção no
  construtor**, nunca o instanciam lá dentro.

---

## 2. Fase 0 — Fundação (dentro do Mês 1, antes de qualquer feature)

Nada de features de utilizador funciona sem isto. É o backbone; entrega-se
como parte do Mês 1, mas constrói-se primeiro.

| Componente | Conteúdo |
|---|---|
| `Env` + `Bootstrap` | carregar `env.php`, handlers globais de erro/excepção, arranque do Router |
| `SupabaseClient` | GET/POST/PATCH/DELETE com cabeçalhos (`apikey`, `Authorization`), modo utilizador vs serviço, upload/signed-URL de Storage |
| `AuthMiddleware` | buscar+cachear `/.well-known/jwks.json`, verificar assinatura ES256, extrair `sub`/claims, `requireAuth()`, `requirePermission()` (lê `user_permissions`) |
| `Router` | `/api/<recurso>/<acção>.php` → método de Controller; 404/405 coerentes |
| `Request` / `Response` | parse de body/query, validação; envelope JSON único |
| `SupabaseClientInterface` + `FakeSupabaseClient` | contrato + fake em memória, para os Models serem testáveis por DI |
| `tests/` + PHPUnit | `phpunit.xml`, autoload, um teste de fumo verde |

**Critério de pronto**: um endpoint `/api/health` autenticado devolve o
`user_id` e o papel do chamador, com JWT inválido a ser rejeitado (401) e
permissão em falta a devolver 403 — tudo pelo servidor; e `phpunit` corre
verde localmente.

---

## 3. Roadmap mês a mês (backend)

Cada mês segue o mesmo template: **Objectivo · Pré-requisitos · Base de
dados · Core · Models · Controllers · Rotas API · Critério de aceitação**.
Cada task dentro do mês arranca pelo ciclo de agentes da **Secção 8.2**
(planear → arquitectura → BD → TDD → revisão → segurança → commit → docs).

### Mês 1 — Gestão de utilizadores e permissões

- **Objectivo**: Admin cria/desactiva utilizadores e atribui permissões
  finas, sobre as 2 contas reais existentes, sem as partir.
- **Pré-requisitos**: Fase 0 concluída; `sb_secret_...` em `env.php`.
- **Base de dados** — migração `0004`:
  - `ALTER TABLE user_roles` + `is_admin`, `full_name`, `phone`,
    `is_active`, `created_by`, `created_at`; `UPDATE ... is_admin=true` nas
    2 contas.
  - `CREATE TABLE user_permissions` (`user_id` FK, `permission`, `granted`,
    `granted_by`, `updated_at`, `UNIQUE(user_id, permission)`).
  - RLS + trigger `log_audit()` em ambas.
  - **Nova, descoberta durante a spec do frontend (16/08/2026)**: activar
    RLS em `transactions` e criar uma política de `SELECT` por empresa
    (`entered_by = current_user_role()`) — hoje não existe nenhuma política
    de leitura (confirmado nas migrações 0001-0003), a tabela está aberta a
    qualquer `authenticated`. Necessário antes dos ecrãs
    `operations-fuellink`/`operations-bankers` (ver
    [ROADMAP_FRONTEND.md](ROADMAP_FRONTEND.md) Secção 7) poderem ler dados
    sem expor a empresa errada. O Ledger de Compensação (futuro) precisa de
    uma via à parte que continue a cruzar as duas — view `SECURITY DEFINER`
    ou endpoint privilegiado, a decidir quando esse ecrã for desenhado.
- **Core**: `AuthMiddleware::requirePermission()` ligado ao `user_permissions`.
- **Models**: `UserRoleModel`, `UserPermissionModel`.
- **Controllers**: `UserController` (list, create [Auth Admin API, serviço],
  deactivate, update), `PermissionController` (catálogo, grant/revoke).
- **Rotas**: `GET/POST /api/users`, `PATCH /api/users/{id}`,
  `POST /api/users/{id}/deactivate`, `GET /api/permissions`,
  `POST /api/permissions/grant`, `POST /api/permissions/revoke`.
- **Aceitação**: não-admin bloqueado no servidor; criar utilizador funciona
  via Admin API; desactivar (nunca apagar); alterações de permissão ficam
  no `audit_log`.

### Mês 2 — Rastreio operacional Fuellink

- **Objectivo**: registar/listar/editar/estornar operações de venda de
  diesel via backend, com cálculo financeiro no servidor.
- **Pré-requisitos**: Mês 1 (permissões `operations.*`).
- **Base de dados**: nenhuma tabela nova — escreve em `transactions`
  (`type='diesel'`). (Migração só se faltar algum índice para as listagens.)
- **Models**: `TransactionModel` (create/edit/void), `RouteModel`,
  `TruckModel`, `DriverModel` (+ resolução truck/driver texto↔Fleet).
- **Controllers**: `OperationController` — cálculo de `amount`/
  `balance_delta`/`unit_rate`/`detail` **movido para PHP** (porta do
  `computeTxFinancials` do Antigo dashboard), gated por `operations.create`/
  `.edit`/`.void`.
- **Rotas**: `POST /api/operations`, `PATCH /api/operations/{id}`,
  `POST /api/operations/{id}/void`, `GET /api/operations/summary` (KPIs).
  **Listar/pesquisar/filtrar não é rota PHP** — direct Supabase, RLS-scoped
  pela migração `0004` (ver [API_CONTRACT.md](API_CONTRACT.md) Secção 0).
- **Aceitação**: operação Fuellink criada pelo servidor com permissão
  verificada e financeiro calculado server-side; void gera entrada
  reversora, original preservado.

### Mês 3 — Upload de provas + testes do módulo Fuellink

- **Objectivo**: anexar prova a uma operação, com validação estrita de
  ficheiro (Cláusula 1.3), e fechar testes do módulo Fuellink.
- **Pré-requisitos**: Mês 2.
- **Base de dados**: reutilizar `delivery_note_path/name` para a prova (1
  ficheiro — decisão fechada); migração só se se optar por colunas próprias
  de prova de diesel.
- **Core**: helpers de Storage no `SupabaseClient` (upload + signed URL);
  **validação estrita server-side** (whitelist de extensão + sniffing de
  MIME + limite de tamanho) — o `accept=` do HTML não conta como estrita.
- **Controllers**: `OperationController::attachProof()`.
- **Rotas**: `POST /api/operations/{id}/proof`,
  `GET /api/operations/{id}/proof-url` (signed URL temporário).
- **Aceitação**: ficheiro de tipo inválido é rejeitado **pelo servidor**;
  suite de testes do módulo Fuellink verde (unit do cálculo financeiro +
  integração dos endpoints).

### Mês 4 — Extensão Bankers

- **Objectivo**: prova de entrega, diferença carregado/entregue, edição do
  valor de fornecimento.
- **Pré-requisitos**: Mês 3.
- **Base de dados** — migração `0005`: `transactions.delivered_litres`
  (para diferença vs `litres` carregado).
- **Models**: `TransactionModel` estendido (logistics + delivered_litres).
- **Controllers**: `OperationController` para `type='logistics'` (Bankers) —
  prova de entrega, cálculo da diferença, edição de valor de fornecimento,
  gated por `operations.upload_delivery_proof`/`.edit_supply_value`/
  `.view_fuel_difference`.
- **Rotas**: reaproveitam `/api/operations/*` com o discriminador de tipo.
- **Aceitação**: Bankers regista entrega + prova, diferença calculada e
  auditada; edição de valor de fornecimento fica no `audit_log`.

### Mês 5 — Módulo financeiro/documental

- **Objectivo**: gerar facturas, cotações, recibos, notas de crédito com
  numeração sequencial e carimbo digital.
- **Pré-requisitos**: Mês 4; decisão da biblioteca PDF.
- **Base de dados** — migração `0006`: `CREATE TABLE documents` (`number`,
  `type`, `related_tx`, `pdf_path`, `stamped`, `created_by`, `created_at`)
  + **sequência atómica** de numeração (Postgres `SEQUENCE` ou tabela de
  contadores com lock) — nunca numeração calculada no cliente.
- **Core**: integração da lib PDF (dompdf/tcpdf/mpdf), **self-hosted** no
  cPanel (sem infra nova — Cláusula 6.2).
- **Models**: `DocumentModel`.
- **Controllers**: `DocumentController` (generate, list, download) — geração
  é operação de **serviço** (numeração sequencial privilegiada).
- **Rotas**: `POST /api/documents`, `GET /api/documents`,
  `GET /api/documents/{id}/pdf`.
- **Aceitação**: número sequencial sem saltos nem duplicados sob concorrência;
  PDF gerado, carimbado, armazenado e recuperável; gated por `documents.*`.

### Mês 6 — Testes integrados, robustez, documentação

- **Objectivo**: fechar o sistema para aceitação final e handover.
- **Pré-requisitos**: Meses 1-5 aceites.
- **Trabalho backend**:
  - Suite de integração ponta-a-ponta dos dois fluxos (Fuellink + Bankers).
  - Revisão de segurança (agente `security-reviewer`): rate limiting nos
    endpoints, higiene de mensagens de erro, verificação de autorização.
  - Performance: paginação nas listagens, índices, revisão de queries N+1.
  - Documentação: referência da API, runbook de deployment cPanel, setup de
    `env.php`, ordem de migrações.
- **Aceitação**: regressão verde, revisão de segurança sem CRÍTICOS,
  documentação e formação entregues (Cláusula 3.4), transferência de IP
  (Cláusula 4.1).

---

## 4. Mapa de rotas API (consolidado)

Contrato completo (pedido/resposta) de cada rota: [API_CONTRACT.md](API_CONTRACT.md).

| Método | Rota | Módulo | Permissão | Modo | Estado |
|---|---|---|---|---|---|
| GET | `/api/health` | Fundação | requireAuth | serviço | ✅ |
| GET | `/api/me` | Fundação | requireAuth (+ is_active) | serviço | ✅ |
| GET | `/api/users` | M1 | requireAuth | utilizador | ❌ |
| POST | `/api/users` | M1 | admin | serviço | ❌ |
| PATCH | `/api/users/{id}` | M1 | admin | serviço | ❌ |
| POST | `/api/users/{id}/deactivate` | M1 | admin | serviço | ❌ |
| GET | `/api/permissions` | M1 | requireAuth | utilizador | ❌ |
| POST | `/api/permissions/grant` | M1 | admin | serviço | ❌ |
| POST | `/api/permissions/revoke` | M1 | admin | serviço | ❌ |
| — | listar/pesquisar/filtrar operações | M2 | RLS (migração `0004`) | **directo Supabase, sem rota PHP** | ⚠️ falta só correr `0004` |
| POST | `/api/operations` | M2 | operations.create | utilizador | ❌ |
| PATCH | `/api/operations/{id}` | M2 | operations.edit | utilizador | ❌ |
| POST | `/api/operations/{id}/void` | M2 | operations.void | utilizador | ❌ |
| GET | `/api/operations/summary` | M2 | requireAuth | utilizador | ❌ |
| POST | `/api/operations/{id}/proof` | M3/M4 | operations.upload_* | utilizador | ❌ |
| GET | `/api/operations/{id}/proof-url` | M3/M4 | operations.view | utilizador | ❌ |
| POST/GET | `/api/documents` | M5 | documents.generate/.view | serviço/utilizador | ❌ |
| GET | `/api/documents/{id}/pdf` | M5 | documents.view | utilizador | ❌ |

---

## 5. Sequência de migrações

Já corridas: `0001`, `0002`, `0003` (ver
[database/migrations/context.md](../database/migrations/context.md)).
Próximas, por mês:

| Migração | Mês | Conteúdo |
|---|---|---|
| `0004` | M1 | estender `user_roles`; criar `user_permissions`; RLS + audit; **RLS de `SELECT` por empresa em `transactions`** (ver Secção 3, Mês 1) |
| `0005` | M4 | `transactions.delivered_litres` |
| `0006` | M5 | `documents` + sequência de numeração |
| (opcional) | qualquer | `route_monthly_adjustments` (ponto 6 da reconciliação) e índices de listagem, quando pesarem |

**Regra**: antes de escrever cada migração, confirmar contra o schema real
(as tabelas de produção já existem) — nunca assumir que algo não existe.

---

## 6. Definição de "pronto" (por módulo)

Um módulo do backend só está pronto para aceitação quando:

- [ ] Todos os endpoints passam por `requireAuth()` + a permissão certa.
- [ ] Operações sensíveis verificadas server-side (testado com conta sem
      permissão → 403).
- [ ] Cálculo financeiro feito no servidor (M2+).
- [ ] Append-only respeitado; alterações no `audit_log`.
- [ ] Validação de input na fronteira; ficheiros validados server-side (M3+).
- [ ] Envelope de resposta consistente.
- [ ] **Unidades de risco do módulo escritas test-first e verdes** (ver
      Secção 7); integração verde contra staging quando aplicável.
- [ ] `context.md` das pastas tocadas actualizado.
- [ ] Repo em estado entregável (Cláusula 3.4).

---

## 7. Estratégia de testes (TDD baseado em risco — fechado 11/08/2026)

Não é 80% cego em tudo. É test-first onde um bug custa dinheiro ou fura o
append-only contratual; integração para o resto; e2e no fim.

**Ferramenta**: PHPUnit (corre local e no cPanel, sem infra nova).

**Pré-condição de arquitectura** (já reflectida na Fase 0): `SupabaseClient`
é uma interface; os Models recebem-no por injecção; existe um
`FakeSupabaseClient` em memória. Sem isto, os testes tocariam na BD de
produção — inaceitável.

**Regra dura**: testes de integração correm contra um **projecto Supabase de
staging separado**, nunca contra a produção. (Decisão pendente menor: criar
esse projecto de staging — sem custo, dentro da conta do cliente.)

### Unidades de risco — sempre test-first (RED→GREEN→REFACTOR)

| Unidade | Mês |
|---|---|
| `computeTxFinancials` (amount/balance_delta/unit_rate) | M2 |
| Verificação de permissão (`requirePermission`) | M1 |
| Validação estrita de ficheiro (MIME/extensão/tamanho) | M3 |
| Diferença carregado/entregue | M4 |
| Numeração sequencial de documentos (sem saltos/duplicados) | M5 |
| Resolução truck/driver texto↔Fleet | M2 |
| Extração/validação de claims do JWT | M1 (Fundação) |

### Cobertura por integração (não test-first, mas coberto)

- Controllers finos (parse→Model→JSON) e o `SupabaseClient` real →
  testes de integração contra staging.

### End-to-end

- Mês 6: fluxos completos dos dois lados (Fuellink + Bankers) ponta-a-ponta.

**Custo estimado**: ~+15-20% de tempo por módulo, concentrado nas unidades
de risco. É o seguro contra retrabalho nos pontos que mexem em dinheiro e
auditoria.

---

## 8. Agentes / squad por tarefa (ECC + AIOX)

Cada task do roadmap arranca já a invocar os agentes certos. Dois conjuntos
disponíveis, dois modos de invocação:

- **ECC** → via a ferramenta Agent (`subagent_type: "<nome>"`) ou os
  slash-commands equivalentes (`/php-review`, `/code-review`,
  `/security-scan`, `/test-coverage`).
- **AIOX** → via a ferramenta Skill (`AIOX:agents:<nome>`) ou, dentro do
  Orion (`aiox-master`), com `@<nome>` / `*agent <nome>`.

### 8.1 Catálogo relevante ao backend

| Papel | ECC | AIOX |
|---|---|---|
| Orquestração | — | `aiox-master` (Orion) |
| Investigação/decisão | `code-explorer` | `analyst` |
| Planeamento / épicos / stories | `planner`, `code-architect` | `pm` (épico/PRD), `sm` (story), `po` (validação) |
| Arquitectura | `architect`, `code-architect` | `architect` |
| Base de dados (Supabase/PostgreSQL) | `database-reviewer` | `data-engineer` |
| Implementação | — | `dev` |
| TDD (test-first) | `tdd-guide` | `dev` (+ `qa`) |
| Revisão de código PHP | `php-reviewer`, `code-reviewer` | `qa` |
| Segurança | `security-reviewer` (+ `/security-scan`) | — |
| Falhas silenciosas / erros | `silent-failure-hunter` | — |
| Simplificação / limpeza | `code-simplifier`, `refactor-cleaner` | — |
| Qualidade de tipos / comentários | `type-design-analyzer`, `comment-analyzer` | — |
| Cobertura / testes de PR | `pr-test-analyzer`, `e2e-runner` | `qa` |
| Performance | `performance-optimizer` | — |
| Build partido | `build-error-resolver` | — |
| Git / PR / release | — | `devops` |
| Documentação | `doc-updater` | — |
| UX onde a API toca o ecrã | `a11y-architect` | `ux-design-expert` |

### 8.2 Ciclo padrão por task (invocar por esta ordem)

Vale para **qualquer** task do roadmap; nem toda a task precisa de todos os
passos, mas arranca-se sempre por aqui:

| # | Passo | ECC | AIOX |
|---|---|---|---|
| 1 | Enquadrar/planear a task | `planner` / `code-explorer` | `@pm` → `@sm` → `@po` |
| 2 | Arquitectura (se estrutural) | `architect` / `code-architect` | `@architect` |
| 3 | Schema / migração (se toca BD) | `database-reviewer` | `@data-engineer` |
| 4 | TDD: teste RED primeiro, depois GREEN | `tdd-guide` | `@dev` |
| 5 | Revisão de código | `php-reviewer` + `code-reviewer` | `@qa` |
| 6 | Segurança (sempre em auth/permissão/upload/$) | `security-reviewer` | — |
| 7 | Falhas silenciosas / simplificação | `silent-failure-hunter`, `code-simplifier` | — |
| 8 | Commit / PR | — | `@devops` |
| 9 | Actualizar docs/context.md | `doc-updater` | — |

> Regra ECC (obrigatória): passos 5 e 6 correm **antes de cada commit** em
> código de auth, permissões, dados de utilizador ou dinheiro. Ver
> `~/.claude/rules/ecc/common/code-review.md` e `security.md`.

### 8.3 Ênfase por mês (quem lidera cada módulo)

| Mês | Agentes em foco | Porquê |
|---|---|---|
| Fundação | `architect`/`@architect`, `security-reviewer`, `tdd-guide` | desenho do Core + JWKS + DI + 1º teste |
| M1 Users/Perms | `@data-engineer`/`database-reviewer`, `security-reviewer`, `php-reviewer` | migração `0004`, RLS, autorização |
| M2 Ops Fuellink | `tdd-guide`, `php-reviewer`, `silent-failure-hunter` | cálculo financeiro server-side |
| M3 Provas+testes | `security-reviewer`, `pr-test-analyzer`, `e2e-runner` | validação estrita de ficheiro + fecho de testes |
| M4 Bankers | `@data-engineer`, `tdd-guide`, `php-reviewer` | diferença carregado/entregue |
| M5 Documentos | `architect`/`@architect`, `database-reviewer`, `security-reviewer` | numeração sequencial atómica + PDF |
| M6 Integração | `e2e-runner`, `security-reviewer`, `performance-optimizer`, `doc-updater` | regressão, hardening, handover |

**Nota de custo (plano ECC)**: cada agente ECC/AIOX arranca "frio" e
re-deriva contexto. Preferir invocar um agente quando há trabalho
especializado real; para orquestração e síntese, o Orion (que já tem o
contexto do projecto) despacha directamente. Não abrir subagente para o que
uma leitura rápida resolve.
