# Roadmap do Frontend — Sistema Completo

**Fuellink & Bankers Tankers Management Platform · Ref. PFB2607**

> Documento de trabalho para quem constrói o **frontend** (HTML/CSS/JS puro em
> `public_html/`, consumindo Supabase directo via RLS para leituras/escritas
> não-privilegiadas, e a API PHP para o resto). Complementa
> [PROPOSTA_DESENVOLVIMENTO.md](PROPOSTA_DESENVOLVIMENTO.md) (visão de
> produto/entregáveis) e [ROADMAP_BACKEND.md](ROADMAP_BACKEND.md) (contrato de
> API que este documento consome), com o detalhe de engenharia de cliente.
> Ler [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) primeiro se ainda não o leste —
> este documento assume esse contexto e não o repete todo.

---

## 0. Ponto de partida real

Nada disto é greenfield. Já existe um ecrã completo, em produção, em
`Antigo dashboard/fuellink-dashboard/index.html` (1 ficheiro HTML+CSS+JS,
~1400 linhas) — o ledger de compensação Fuellink/Bankers, usado pelas 2
contas reais. **O trabalho dos meses seguintes é extrair e reaproveitar esta
lógica para dentro da estrutura `public_html/`, não reescrevê-la.** Antes de
implementar qualquer ecrã novo, ler a Secção 5 abaixo para saber o que já
existe e só precisa de ser portado.

Estado actual de `public_html/`: esqueleto de pastas vazio (só `context.md`
em cada uma). Nenhuma página nova foi construída ainda.

## 1. Princípios transversais (valem em TODO ecrã novo)

1. **Regra de arquitectura (repetir sempre)** — leituras simples e escritas
   não-privilegiadas → frontend fala **directo com Supabase** (chave
   `anon`/`publishable`), protegido por RLS; operações privilegiadas → passam
   sempre pela API PHP (`/api/*`), nunca directo do browser. Ver
   [ROADMAP_BACKEND.md](ROADMAP_BACKEND.md) Secção 4 para o mapa de rotas.
2. **1 HTML por ecrã, 1 JS view por ecrã** — `pages/<ecrã>.html` +
   `assets/js/views/<ecrã>.js`, seguindo a Secção 7 de
   [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md). Nada de lógica de página inline
   no HTML como no Antigo dashboard — esse padrão foi correcto para um
   protótipo, mas o Mês 1 é o ponto de sair dele.
3. **Interface consciente do papel (role-aware)** — o mesmo ecrã muda
   consoante quem o vê; **esconder** o que o utilizador não pode fazer, não
   só desactivar o botão. Depende do catálogo de permissões (Secção 6).
4. **Densidade de informação > minimalismo decorativo** — hierarquia em
   camadas (poucos números grandes no topo, resto atrás de detalhe).
5. **Estado e histórico sempre visíveis** — cada registo mostra o seu estado
   (draft/submitted/void) e rasto de "quem fez o quê, quando".
6. **Confirmação explícita em acções irreversíveis** — fricção é sinal de
   confiança em fluxos financeiros, nunca um defeito de UX a eliminar.
7. **Mobile-first onde há trabalho de terreno** — formulários de registo de
   operação (Mês 2+) são usados junto ao camião: dedos grandes, pouco scroll.
8. **Cor com significado, nunca decoração** — verde=normal/aceite,
   âmbar=pendente/a dever, vermelho=precisa de atenção — consistente em toda
   a app.
9. **Nunca a chave secreta no browser** — só a chave `anon`/`publishable` do
   Supabase chega ao frontend. Qualquer coisa que precise de
   `SUPABASE_SECRET_KEY` é sempre um pedido a `/api/*`.
10. **Validação client-side nunca é a validação real** — `accept=` em inputs
    de ficheiro, `required` em formulários, etc. são UX, não segurança; a
    validação que conta corre sempre no servidor (Cláusula 1.3 do contrato).

## 2. Stack, convenções e estrutura de pastas

| Camada | Escolha |
|---|---|
| Markup/estilo | HTML5 + CSS puro (sem framework, sem pré-processador) |
| Comportamento | JavaScript ES modules, sem framework (sem React/Vue/etc.) |
| Dados | `supabase-js` (CDN ou vendored), chave `anon` |
| Hospedagem | GoDaddy/cPanel, `public_html/` = document root |

```
public_html/
├── api/                     ← front controller PHP (não é frontend, mas é o que o frontend chama)
├── pages/                   ← 1 HTML por ecrã (users.html, operations-fuellink.html, ...)
└── assets/
    ├── css/                 ← base + tema por empresa (fuellink/bankers)
    ├── js/
    │   ├── config/          ← supabase-client.js (chave pública, URL do projecto)
    │   ├── core/             ← auth.js (guard de sessão), cliente API partilhado para /api/*
    │   ├── models/           ← 1 módulo por tabela: leituras/escritas directas via RLS
    │   └── views/            ← 1 ficheiro por página, controla o HTML correspondente
    └── img/
```

- `assets/js/config/supabase-client.js` — inicializa `supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)`
  uma única vez; todos os outros módulos importam esta instância (o Antigo
  dashboard faz isto inline, linha ~500 — extrair para aqui primeiro).
- `assets/js/core/auth.js` — `requireSession()` / `requireAdmin()` (ou
  equivalente), chamado no arranque de **toda** página nova; nunca
  reimplementar o guard por página. Refresh de sessão/token é automático via
  `supabase-js` — não reimplementar isso à mão.
- `assets/js/models/*.js` — espelham as tabelas reais (Secção 4). Só leituras
  simples / escritas não-privilegiadas. Qualquer coisa privilegiada chama a
  API PHP.
- `assets/js/views/*.js` — 1 por página, importa os `models/` e `core/` que
  precisa, controla o DOM dessa página.

## 3. Design system / marca

- **Paleta** (já validada em produção, não introduzir uma terceira):
  - Fuellink: `#2a78d6`
  - Bankers (Bakers): `#eb6834`
  - Estados: verde = normal/aceite, âmbar = pendente, vermelho = atenção
    (ver paleta exacta usada no Antigo dashboard, bloco `:root` no topo do
    `<style>`, antes de introduzir tons novos).
- **Tipografia**: `system-ui, -apple-system, "Segoe UI", sans-serif` — stack
  já usado, manter.
- **Tema por empresa** — a cor de acento (`--accent` ou equivalente) muda
  consoante a empresa do utilizador autenticado. É o mesmo mecanismo em dois
  sítios:
  1. **Login** (Secção 7) — layout próprio, split-screen, com selector de
     empresa explícito (decisão fechada 11/08/2026, ver
     [PROPOSTA_DESENVOLVIMENTO.md](PROPOSTA_DESENVOLVIMENTO.md) Secção 3) —
     a empresa escolhida no selector define o tema do próprio ecrã de login.
  2. **Sidebar global** (Secção 7) — uma única sidebar de navegação
     partilhada por todas as páginas internas, cuja cor de acento muda
     consoante a empresa do utilizador **já autenticado** (não um selector —
     vem de `user_roles.role`). Construir como componente único reutilizável
     em `assets/js/core/` + CSS com variável de acento por empresa, aplicado
     a partir da primeira página do Mês 1. A página de login **não** usa esta
     sidebar.
- **Correcção de grafia obrigatória**: "Bankers Tankers", nunca "Bonkers
  Tankers" (erro presente na referência visual externa) — nunca deixar
  entrar em texto real da aplicação.
- **Referência visual externa** (`../referencias visuais/deepseek_html_20260808_481ef9.html`)
  é só inspiração de layout para o login (split-screen + selector) — **a
  paleta dela é genérica Bootstrap e não deve ser usada**; usar sempre a
  paleta real acima.

## 4. Dados — tabelas reais que o frontend lê/escreve directamente

Regra de ouro: isto é o que se lê/escreve **directo via Supabase (RLS)**.
Qualquer escrita fora desta lista (criar utilizador, gerar PDF numerado,
alterar permissões) passa pela API PHP — ver
[ROADMAP_BACKEND.md](ROADMAP_BACKEND.md) Secção 4.

| Tabela | Uso no frontend |
|---|---|
| `user_roles` | `role` = empresa (`bakers`/`fuellink`) do utilizador autenticado — define o tema. Mês 1 estende com `is_admin`, `full_name`, `phone`, `is_active`. |
| `user_permissions` | Mês 1+. Ler para decidir o que mostrar/esconder no ecrã (role-aware); nunca confiar só em `is_admin` no cliente — o servidor volta a verificar. |
| `routes` | Selects de rota nos formulários de operação logistics; `adj_may/june/july` + `base_rate` compõem a taxa (ver `routeTotalRate` no Antigo dashboard). |
| `fuellink_settings` | Preço global do diesel (`diesel_price`, linha única `id=1`), usado nas operações `type='diesel'`. |
| `bakers_settings` | Mês activo de ajuste (`month`, linha única `id=1`) — decide que coluna `adj_*` de `routes` se aplica. |
| `transactions` | O ledger partilhado — escrita directa (create) para o que não é privilegiado, mas o **cálculo financeiro** (`amount`/`balance_delta`/`unit_rate`) passa a ser feito no servidor a partir do Mês 2 (ver Secção 5) — o frontend deixa de calcular isto sozinho. **Leitura passa a ser âmbito-empresa** para os ecrãs de Operações (ver Secção 7) — hoje não há nenhuma política RLS de `SELECT` em `transactions` (confirmado nas migrações 0001-0003), leitura está aberta a qualquer `authenticated`; isto tem de mudar antes destes ecrãs poderem existir. Só o futuro Ledger de Compensação continua a cruzar as duas empresas. Ver [database/migrations/context.md](../database/migrations/context.md). |
| `trucks` / `drivers` | Fleet normalizada; usados para popular `<datalist>` de sugestões nos campos de texto livre camião/motorista. |
| `audit_log` | Ainda não surfaced em nenhum ecrã — não construir UI para isto sem pedido explícito (YAGNI). |

**Nota de tipo**: `transactions.type` discrimina `logistics`/`diesel`/
`settlement`/`void`. A tabela de operações do dashboard **difere por
empresa**: Fuellink mostra litros/valor de venda; Bankers mostra litros/valor
de aluguer + prova de entrega.

## 5. Lógica a portar do Antigo dashboard (não reescrever)

Estas funções já existem, testadas em produção, em
`Antigo dashboard/fuellink-dashboard/index.html`. Extrair para os módulos
novos correspondentes em vez de reimplementar:

| Função/padrão actual | Vai para | Nota |
|---|---|---|
| `resolveTruck(text)` / `resolveDriver(text)` | `assets/js/models/trucks.js` / `drivers.js` | Texto livre com fallback de match à Fleet (case-insensitive); nunca cria registo novo automaticamente na Fleet a partir de texto não encontrado. |
| `computeTxFinancials({...})` | **Migra para o servidor no Mês 2** (`OperationController`, ver ROADMAP_BACKEND) | O frontend deixa de o chamar para criar operações — só o usa (se precisar) para pré-visualização optimista, nunca como fonte de verdade do valor gravado. |
| `EDIT_SPECS` (editor genérico de registo) | `assets/js/core/` ou `views/` do ecrã de detalhe de operação | Padrão de "1 spec por tabela editável, `fields()` descreve os campos" — vale a pena manter o padrão, só trocar o alvo de escrita (Supabase directo → API PHP quando o campo for sensível). |
| `canEditTransaction(tx)` / `isTransactionVoided(id)` | `assets/js/models/transactions.js` | Lógica de UI (mostrar/esconder acção de editar); a permissão real continua a ser verificada no servidor. |
| `ROLE_EMAIL` (mapa role→email fixo) | **Não portar tal como está** | Mês 1 introduz utilizadores reais (`user_permissions`); o mapa fixo de 2 emails deixa de fazer sentido assim que existirem mais contas — o login passa a autenticar por email/password normal e resolver `role`/`is_admin` de `user_roles` depois. |
| Paleta CSS (`--fuellink`, `--bakers`, cores de estado) | `assets/css/` | Extrair para variáveis CSS partilhadas em vez de duplicar por página. |
| `populateTruckAndDriverDatalists()` | `assets/js/views/` do ecrã de operações | Padrão de `<datalist>` para sugestões — reaproveitar. |

## 6. Catálogo de permissões (para UI role-aware)

Do handoff ([PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) Secção 4) — usar estes
códigos para decidir o que mostrar/esconder. **Nunca gate no cliente sozinho
— o servidor verifica sempre de novo**, isto é só para não mostrar botões que
vão dar 403.

| Código | Módulo | Natureza (orienta UI: pedir confirmação extra se "Sensível") |
|---|---|---|
| `operations.create` | Fuellink (M2) | Operacional |
| `operations.upload_proof` | Fuellink (M3) | Operacional |
| `operations.view` | Fuellink (M2) | Operacional |
| `operations.edit` | Fuellink (M2) | Sensível |
| `operations.void` | Fuellink (M2) | Sensível |
| `operations.upload_delivery_proof` | Bankers (M4) | Operacional |
| `operations.edit_supply_value` | Bankers (M4) | Sensível |
| `operations.view_fuel_difference` | Bankers (M4) | Operacional |
| `ledger.view` | Ledger | Operacional |
| `ledger.add_transaction` | Ledger | Sensível |
| `ledger.void_transaction` | Ledger | Sensível |
| `routes.edit_price` | Ledger | Sensível |
| `documents.generate_*` (invoice/quotation/receipt/credit_note) | Financeiro (M5) | Sensível |
| `documents.view` | Financeiro (M5) | Operacional |

Filosofia (decisão explícita do cliente): **tudo é tecnicamente delegável**
pelo Admin, incluindo acções sensíveis — a distinção Operacional/Sensível é
só orientação de UI (pedir confirmação extra), nunca uma restrição rígida.

## 7. Inventário de ecrãs — estado das decisões

### Login (layout exclusivo — não reutiliza a sidebar)
- Split-screen: painel com marca do cliente (Fuellink — ícone
  gota+ligação, azul `#185FA5`/`#042C53` de marca), painel com formulário.
- **Com selector de empresa explícito** (decisão fechada 11/08/2026 — revê a
  decisão original "sem selector" do handoff). A empresa escolhida define o
  tema do ecrã; `role`/`is_admin` continuam a resolver-se de `user_roles`
  **depois** da autenticação — o selector é UX/tema, nunca a fonte de
  verdade da autorização.
- Sem self-signup — só o Admin cria contas (via API PHP, Mês 1).
- **Forgot Password — resolvido (16/08/2026)**: recuperação **self-service**
  via Supabase Auth (fluxo padrão de email), sem intervenção do Admin.

### Sidebar global (componente partilhado, decisão fechada 11/08/2026)
- Uma sidebar única para todas as páginas internas; cor de acento por
  empresa do utilizador autenticado. Ver Secção 3. Construir logo na
  primeira página do Mês 1 — todas as páginas seguintes dependem dela.

### Dashboard (spec fechada 16/08/2026)

**1 único ecrã** (`dashboard.html`), ao contrário das Operações — o
conteúdo adapta-se à empresa do utilizador autenticado (como a sidebar), não
são dois fluxos de trabalho distintos. Aplica a mesma regra de isolamento
decidida para as Operações: KPIs próprios da empresa sempre visíveis; tudo o
que cruza as duas empresas só aparece a quem tiver `ledger.view`. Isto
**substitui** a nota antiga do handoff ("isolamento formal fica para o
futuro") — fica resolvido aqui, não fica mais em aberto.

**Zona 1 — Filtro**: período + comparação (actual vs período anterior) +
estado.

**Zona 2 — KPIs próprios da empresa (4 cartões, sempre visíveis)**:

| # | Fuellink | Bankers |
|---|---|---|
| 1 | Litros vendidos (período) | Litros transportados (período) |
| 2 | Valor total vendido (período) | Valor total de fornecimento (período) |
| 3 | Nº de operações (período) | Nº de entregas (período) |
| 4 | **Preço médio do diesel aplicado (R/L)** — média do `unit_rate` congelado nas operações do período; sinal de consistência de preço, já que `fuellink_settings.diesel_price` pode mudar entretanto e cada operação fica presa ao valor de quando foi criada | **Diferença acumulada carregado vs. entregue (litros)** — soma de `litros − litros_entregues` no período; sinal de perda/desvio sistemático. **Depende do Mês 4** (`litros entregues` ainda não existe) — mostra "—" ou fica oculto até esse campo existir |

Critério usado para o KPI 4 de cada lado: os KPIs 1-3 são sempre "actividade
normal" (volume/receita/contagem); o KPI 4 é, nos dois lados, um **sinal
diferenciado** — risco/perda do lado Bankers, consistência de preço do lado
Fuellink — não só mais um totalizador.

**Zona 2b — Net Position (só com `ledger.view`)**: banner de saldo líquido
+ descrição de quem deve a quem (igual ao actual, `net-banner`/`netValue`/
`netDesc` no Antigo dashboard) + "Settlements recorded" (total R +
contagem) — este último sai dos KPIs próprios porque é inerentemente um
pagamento entre as duas empresas, não pertence a nenhum dos dois lados
sozinho.

**Zona 3 — Gráficos**: sempre visível — tendência própria da empresa
(vendas Fuellink / fornecimento Bankers ao longo do tempo, actual vs período
anterior). Só com `ledger.view` — o gráfico cruzado actual "Net balance over
time" (saldo corrente, `renderChart`).

**Zona 4 — Tabela "últimas operações"**: só as operações da própria
empresa, mesmas colunas já fechadas nos ecrãs `operations-fuellink.html` /
`operations-bankers.html` (Secção 7).

**Nota técnica**: a Zona 2b/3-cruzada precisa da mesma via privilegiada já
identificada para o Ledger de Compensação — não passa pela política de
`SELECT` âmbito-empresa que as Operações vão usar. Ver
[database/migrations/context.md](../database/migrations/context.md).

### Gestão de Utilizadores (Mês 1)
- Tabela: avatar, nome+email, telefone, role badge, estado
  activo/inactivo + toggle, "Criado em", ícone de editar. Painel de
  permissões ao lado, agrupado em **Operacional** vs **Sensível — requer
  confirmação**, com rasto de auditoria visível ("última alteração: quem,
  quando, o quê").
- **Sem ícone de apagar** — nunca se apaga um utilizador, só se desactiva
  (`is_active`).
- Filtros (papel, estado), pesquisa, ordenação, botão "+ Adicionar
  utilizador" → chama API PHP (`POST /api/users`, privilegiado).

### Operações — Fuellink e Bankers (spec fechada 16/08/2026)

**Decisão**: **dois ecrãs distintos e mutuamente isolados**
(`pages/operations-fuellink.html` / `pages/operations-bankers.html`), não
um ecrã partilhado com colunas condicionais, e não o modelo do Antigo
dashboard (onde qualquer conta via as transacções das duas empresas). Razão:
esse modelo funciona com 2 contas Admin que já confiam uma na outra, mas
deixa de ser aceitável assim que existirem Users normais de cada empresa
(Mês 1), que não devem ver os números comerciais da contraparte — nem
Fuellink deve ver valor de venda/preço do diesel da Bankers, nem a Bankers
deve ver valor de fornecimento da Fuellink. O saldo líquido cruzado entre as
duas continua a existir, mas vive só no ecrã **Ledger de Compensação**
(à parte, gated por `ledger.view`) — as listas de Operações do dia-a-dia
nunca o mostram.

**Implicação técnica (novo ponto de reconciliação, fora dos 7 originais)**:
`transactions` não tem hoje nenhuma política RLS de `SELECT` — confirmado,
nenhuma das migrações 0001-0003 criou uma, e a tabela nem tem RLS activado
(só `audit_log` tem). Antes destes dois ecrãs poderem ler dados, precisa de
existir uma política de leitura por `entered_by = empresa do utilizador`,
com uma via à parte (view/endpoint privilegiado) só para o Ledger de
Compensação. Ver [database/migrations/context.md](../database/migrations/context.md)
e [ROADMAP_BACKEND.md](ROADMAP_BACKEND.md) Secção 5.

#### Operações Fuellink (`operations-fuellink.html`)

**Lista** — colunas: Data · Camião · Motorista (+telefone) · Litros
vendidos · Valor de venda (calculado, não editável) · Prova (✓/✗) · Estado
· Nota · Acções (editar/estornar, só nas próprias linhas, só com
`operations.edit`/`.void`). Filtros: período, camião, ordenação. Sem acções
rápidas na linha — editar/estornar vivem só no ecrã de Detalhe, com
confirmação. Linhas anuladas aparecem esbatidas.

**"Estado" é derivado, não um campo guardado** — não existe
`draft`/`submitted` em produção (isso era do desenho greenfield, nunca
construído; confirmado por busca no código real). Só existe
**Activo / Anulado**, calculado a partir de existir ou não uma linha
`type='void'` cujo `voids_id` aponta para esta.

**Nova Operação** — campos: Data\* · Litros vendidos\* · Camião\* (texto +
sugestões Fleet) · Motorista\* (texto + sugestões Fleet) · Trailer
(opcional) · Prova (opcional, upload **inline** no mesmo formulário — é
trabalho **novo**: hoje só a Bankers tem este campo; reaproveita o padrão
já provado `delivery_note_path`/`delivery_note_name`, activado agora também
para `type='diesel'`) · Nota (opcional). Valor de venda **sempre calculado
no servidor** (litros × `fuellink_settings.diesel_price`) — nunca um campo
editável no formulário, hoje nem existe esse campo na UI actual.

**Fora do âmbito** (não existem no schema real, sem uso conhecido no
ledger — só voltam à mesa se pedidos explicitamente): valor de compra do
combustível, valor de aluguer do lado Fuellink. Sem nada da Bankers: sem
rota, litros entregues, diferença, valor de fornecimento.

#### Operações Bankers (`operations-bankers.html`)

**Lista** — colunas: Data · Camião · Motorista (+telefone) · Trailer ·
Rota · Litros carregados · Litros entregues (novo, Mês 4) · Diferença
(calculado) · Valor de fornecimento (calculado — ver nota de edição abaixo)
· Prova de entrega (✓/✗) · Estado (Activo/Anulado, mesma regra derivada da
Fuellink) · Nota · Acções. Mesmos filtros e mesmas regras de acções
rápidas/linhas anuladas que o lado Fuellink.

**Nova Entrega** — campos: Data\* · Rota\* (selector `routes`) · Litros
carregados\* · Camião\* (texto + sugestões Fleet) · Motorista\* (texto +
sugestões Fleet) · Trailer (opcional) · Prova de entrega (opcional, upload
inline — já existe hoje como padrão, `txDeliveryNote`) · Nota (opcional).
Valor de fornecimento **sempre calculado no servidor** (litros × taxa da
rota: `base_rate + adj_<mês activo>`) — nunca editável na criação. Litros
entregues e diferença ficam para o ecrã de Detalhe (Mês 4), não para a
criação.

**Edição do valor de fornecimento (assunção de trabalho, a validar em
teste de aceitação)**: no `EDIT_SPECS` actual, editar uma operação
`logistics` não tem campo de "Amount" livre — edita-se litros/rota e o
valor **recalcula automaticamente** à taxa congelada (`unit_rate`); só
`settlement` tem um campo de valor manual. Mantemos este comportamento
(editar litros/rota → recálculo) em vez de introduzir um campo de override
manual — reavaliar só se a Bankers precisar de corrigir um valor sem que os
litros tenham mudado.

**Ligação a uma operação Fuellink específica**: **em standby, fora da Fase
1**. Litros carregados são digitados directamente pela Bankers, sem picker
nem UI de ligação. Um campo de referência (`related_transaction_id` ou
equivalente) pode ficar reservado na BD para o futuro, mas não é exposto na
interface agora.

**Sem visibilidade cruzada de estado**: a Fuellink não vê, no seu próprio
ecrã, se a operação já foi entregue pela Bankers, e vice-versa — decisão
fechada (YAGNI), revisitar só se pedido.

#### Detalhe da Operação (spec fechada 16/08/2026)

Não existe hoje como ecrã — no Antigo dashboard, editar/estornar acontece
num modal por cima da lista (`EDIT_SPECS`, linhas 791-920). Vira ecrã
próprio (`operation-detail.html?id=...` ou equivalente), mobile-first,
comum na estrutura aos dois lados, com conteúdo próprio de cada empresa
(mesma separação da Lista — nunca mistura dados das duas):

1. **Cabeçalho** — tipo (badge), estado (Activo/Anulado), data.
2. **Corpo** — os mesmos campos já fechados na Lista de cada lado, em modo
   leitura, + prova/prova de entrega com pré-visualização (reaproveita
   `sb.storage.from('delivery-notes').createSignedUrl`, já existe).
3. **Editar** (só se `canEdit`: própria empresa, não anulada, `operations.edit`)
   — formulário inline com os campos já editáveis hoje: data, litros,
   camião, motorista, trailer, nota (+ rota e prova de entrega só do lado
   Bankers), com o aviso de taxa congelada já existente ("Rate frozen at
   creation: R.../L — editar litros recalcula a este valor, não ao de
   hoje").
4. **Estornar** (só se `canEdit`, `operations.void`) — botão + confirmação
   explícita (irreversível); gera entrada reversora; original fica esbatido
   com "Anulada em [data]".
5. **Bankers apenas (Mês 4)**: é **aqui**, não no formulário de criação, que
   se preenche litros entregues + prova de entrega (se ainda não anexada) —
   a diferença calcula-se automaticamente assim que os litros entregues são
   preenchidos.

**Histórico de alterações — decidido (16/08/2026): fora do âmbito por
agora.** `audit_log` já existe em produção mas continua sem UI (YAGNI
mantido). Nota técnica encontrada ao avaliar isto: a política de leitura do
`audit_log` (migração 0003) é `USING (true)` — aberta a qualquer
`authenticated`, sem distinção de empresa. Se algum dia se decidir surfaçar
isto, precisa primeiro de uma política nova que verifique a empresa do
registo referenciado (mais complexa que a correcção já planeada para
`transactions`, que só olha para `entered_by` na própria linha) — não
implementar sem essa correcção.

### Por desenhar ainda (inventário completo)
- Ledger de Compensação — redesign do que já existe em produção, agora o
  único ecrã que cruza as duas empresas (sem mês fixo atribuído; reaproveitar
  o Antigo dashboard como base funcional)
- Módulo Financeiro/Documental — lista de documentos, gerar, pré-visualizar
  PDF (Mês 5)
- Definições de conta/perfil

## 8. Requisitos não-funcionais que tocam o frontend (Cláusula 1.3)

| Requisito | Implicação para o frontend |
|---|---|
| Append-only + auditoria | UI nunca oferece "apagar" em dados financeiros/utilizadores — só "desactivar"/"estornar". Rasto de auditoria visível onde fizer sentido (Gestão de Utilizadores). |
| Validação estrita de tipo de ficheiro | `accept="image/png,image/jpeg,application/pdf"` no `<input>` é só UX — a rejeição real vem do servidor (Mês 3). Mostrar o erro do servidor de forma clara se o ficheiro for rejeitado depois do upload. |
| HTTPS/TLS em todos os pontos de acesso | Nada de específico a construir no frontend; confirmar que nenhum recurso (CDN de `supabase-js`, imagens) é carregado por `http://`. |
| Acesso responsivo desktop/mobile | Mobile-first já parcialmente coberto no Antigo dashboard (`@media max-width:720px`) — priorizar isto já no formulário de registo de operação do Mês 2. |
| Storage privado + URLs assinadas | Nunca construir um link directo e permanente para um ficheiro de `delivery-notes` — pedir sempre uma signed URL (via Supabase directo para leitura simples, ou via API se a lógica for privilegiada). |

## 9. Definição de "pronto" (por ecrã)

- [ ] Segue o padrão 1 HTML + 1 JS view (nada de lógica inline nova).
- [ ] Chama `core/auth.js` no arranque; nenhuma leitura acontece antes de a
      sessão estar confirmada.
- [ ] Esconde (não só desactiva) o que a permissão do utilizador não cobre.
- [ ] Usa a sidebar global e o tema por empresa (excepto login).
- [ ] Escritas privilegiadas vão para `/api/*`, nunca para a chave secreta
      no browser.
- [ ] Estados/erros do servidor são mostrados de forma clara (nunca falha
      silenciosa).
- [ ] Acção irreversível pede confirmação explícita.
- [ ] Testado em pelo menos um breakpoint mobile real (não só DevTools).
- [ ] `context.md` da pasta tocada (`pages/`, `assets/js/views/`, etc.)
      actualizado.

## 10. Ordem de trabalho sugerida

1. `assets/js/config/supabase-client.js` + `assets/js/core/auth.js` —
   fundação que toda página nova depende, extraída do Antigo dashboard.
2. Sidebar global (`assets/js/core/`) + CSS de tema por empresa.
3. Login (`pages/login.html`) — layout exclusivo, selector de empresa.
4. `pages/users.html` (Mês 1) — primeira página a sair do padrão "tudo
   inline"; valida que o padrão novo (HTML+view+model separados, sidebar,
   auth guard) funciona de ponta a ponta antes de replicar para os ecrãs
   seguintes.
5. Seguir o inventário da Secção 7, na ordem do plano de entrega (Mês 2 em
   diante), portando a lógica da Secção 5 à medida que cada ecrã precisa
   dela — nunca todos de uma vez.
