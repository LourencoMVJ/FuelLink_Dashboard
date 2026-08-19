# Proposta de Desenvolvimento — Sistema Completo

**Fuellink & Bankers Tankers Management Platform · Ref. PFB2607**

> Este documento traduz [docs/PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) (o
> handoff de arquitectura) num plano técnico executável, mês a mês, com as
> decisões de arquitectura em aberto já resolvidas (ou explicitamente
> marcadas como pendentes de confirmação do cliente). É o documento de
> trabalho para conduzir os 6 meses do contrato (Cláusula 1.2) a partir do
> estado real do repositório, não de um ponto de partida greenfield.

## 0. Ponto de partida real

- Já em produção: ledger partilhado (`transactions`), edição com grant
  estreito por coluna + `audit_log` por trigger, upload de delivery note,
  realtime via Supabase channels, 2 contas reais (`waseem@bakers.co.za`,
  `info@fuelink.co.za`) — tudo num único ficheiro
  (`Antigo dashboard/fuellink-dashboard/index.html`).
- Ainda nada: camada PHP (`private/`), separação em páginas/views
  (`public_html/`), `user_permissions`, papel Admin/User.
- Cláusula 1.3 do contrato torna **contratuais** (não só boas práticas):
  princípio append-only, validação estrita de tipo de ficheiro, HTTPS/TLS
  em todos os pontos de acesso, acesso responsivo desktop/mobile.

## 1. Decisões de arquitectura — os 7 pontos de reconciliação

### 1. Company vs Role — **resolver assim**

Não criar uma tabela `profiles` paralela. Estender a própria `user_roles`
(já é 1:1 com `auth.users`, já tem as 2 contas reais):

```sql
ALTER TABLE public.user_roles
  ADD COLUMN is_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN full_name text,
  ADD COLUMN phone text,
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN created_by uuid,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

UPDATE public.user_roles SET is_admin = true; -- as 2 contas existentes
```

Uma tabela só, `role` = empresa, `is_admin` = papel. Sem migração de dados
de uma tabela para outra, sem risco de desligar as 2 contas.

### 2. Trucks/Drivers — ✅ já resolvido (migração 0002, texto livre + fallback Fleet)

### 3. Ledger único vs `operations` por empresa — **resolver assim**

O Mês 2 ("rastreio operacional Fuellink: camião, motorista, litros,
valores") é, campo a campo, o que `transactions type='diesel'` já captura
e já tem RLS, edição, audit log e realtime provados em produção. **Não
criar uma tabela `operations` nova** — o ecrã do Mês 2 escreve directamente
em `transactions`, através do novo Controller/Model PHP para as operações
privilegiadas, e lê via Supabase directo (RLS) para as não-privilegiadas.
Evita sincronizar duas tabelas para os mesmos dados.

### 4. Anexos — **resolver assim**

Manter o padrão actual (1 ficheiro por operação, colunas directas em
`transactions`) em vez de `operation_attachments`. Para o Mês 3 (prova de
Fuellink) e Mês 4 (prova de entrega Bankers), reaproveitar exactamente o
padrão já provado do `delivery_note_path`/`delivery_note_name`. Só revisitar
para uma tabela de anexos própria se, durante os testes de aceitação do
Mês 3, surgir uma necessidade real de múltiplos ficheiros por operação —
não construir isso especulativamente agora (YAGNI).

### 5. `trailer_reg` — ✅ já resolvido (migração 0001)

### 6. `routes` com colunas por mês — **resolver assim**

Antes que se acumulem mais colunas (`adj_august`, `adj_september`...),
migrar para uma tabela normalizada:

```sql
CREATE TABLE public.route_monthly_adjustments (
  route_id text NOT NULL REFERENCES public.routes(id),
  month text NOT NULL,
  adj_value numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (route_id, month)
);
-- migrar adj_may/adj_june/adj_july existentes para linhas desta tabela,
-- depois decidir se as colunas antigas ficam (read-only, para não partir
-- nada que ainda as leia) ou são removidas numa migração posterior.
```

Baixo risco, mecânico. Não é urgente para nenhum módulo específico, mas
convém fazer-se antes de Agosto acumular mais uma coluna.

### 7. `user_permissions` — **resolver assim**

Implementar exactamente como desenhado (catálogo de texto livre, sem
`CHECK` rígido, `UNIQUE(user_id, permission)`), com FK para
`user_roles.user_id` (não para uma `profiles.id` que não existe). Este é
100% o âmbito do Mês 1.

## 2. Plano mês a mês

### Mês 1 — Gestão de utilizadores e permissões

- **DB**: migração acima (ponto 1) + tabela `user_permissions` + política
  RLS + trigger de auditoria (reaproveitar `log_audit()` de 0003 nas duas
  tabelas novas).
- **PHP**: `AuthMiddleware` — **confirmado (11/08/2026)**: o projecto usa
  JWT assimétrico (JWKS, `kty=EC` P-256, `alg=ES256`), verificado via o
  endpoint público `/auth/v1/.well-known/jwks.json`, sem segredo partilhado.
  `UserController` (criar/desactivar/listar — criar utilizador precisa da
  Admin API do Supabase com a chave secreta, logo é privilegiado);
  `PermissionController`. **Falta only**: o valor `sb_secret_...` colocado em
  `private/config/env.php` no servidor (nunca no repo).
- **JS**: `pages/users.html` + `assets/js/views/users.js` +
  `assets/js/models/users.js` (leitura via RLS) — primeira página a sair do
  padrão "tudo inline" do Antigo dashboard.
- **Ecrã**: conforme Secção 9 do handoff (tabela + painel de permissões
  Operacional/Sensível, sem ícone de apagar, só desactivar).
- **Checklist de entrega**: confirmar certificado SSL/HTTPS activo no
  cPanel (Cláusula 1.3) como parte deste primeiro módulo em produção.

### Mês 2 — Rastreio operacional Fuellink

- Sem tabela nova (ver ponto 3 acima) — escreve em `transactions`.
- `pages/operations-fuellink.html` (lista, filtros) + formulário de registo,
  mobile-first (Secção 8, princípio 5 — usado junto ao camião).
- Escrita gated por `user_permissions` (`operations.create`,
  `operations.edit`, `operations.void`) em vez de "é admin?".
- Ponto natural para começar a extrair lógica do Antigo dashboard
  (`resolveTruck`/`resolveDriver`/`computeTxFinancials`/`EDIT_SPECS`) para
  `assets/js/models/` e `assets/js/core/`, reaproveitando-a, não
  reescrevendo-a.

### Mês 3 — Upload de provas + testes do módulo Fuellink

- Prova de venda Fuellink: mesmo padrão de `delivery_note_path/name`,
  aplicado ao `type='diesel'`.
- **Validação estrita de tipo de ficheiro (Cláusula 1.3)**: o `accept=`
  do HTML não é "estrita" — precisa de validação de MIME/extensão no lado
  do PHP antes de reencaminhar para o storage. Este é o primeiro sítio onde
  isso passa a ser obrigatório, não opcional.
- Testes do módulo Fuellink de ponta a ponta antes da aceitação do Mês 3.

### Mês 4 — Extensão Bankers

- Prova de entrega (já existe o padrão), diferença carregado/entregue
  (precisa de um novo campo, ex. `delivered_litres`, para comparar com
  `litres`), edição do valor de fornecimento.
- As permissões já estão catalogadas no handoff
  (`operations.upload_delivery_proof`, `operations.edit_supply_value`,
  `operations.view_fuel_difference`) — só faltava o `user_permissions` do
  Mês 1 para as tornar reais.

### Mês 5 — Módulo financeiro/documental

- Facturas, cotações, recibos, notas de crédito, carimbo digital.
- Precisa de numeração sequencial seguindo o princípio de audit trail —
  **operação privilegiada por natureza**, nunca gerada do browser.
- Tabela nova `documents` (número, tipo, transacção(ões) relacionada(s),
  caminho do PDF, criado_por, criado_em).
- **Decisão técnica em aberto**: biblioteca de geração de PDF em PHP
  (ex. dompdf/tcpdf) — tem de correr no cPanel existente, sem infraestrutura
  nova (Cláusula 6.2 / Secção 6 do handoff).

### Mês 6 — Testes integrados, ajustes finais, documentação, formação

- Regressão completa nos dois fluxos (Fuellink e Bankers).
- Handover final: código-fonte + documentação completa + formação
  (Cláusula 3.4), transferência de propriedade intelectual após pagamento
  da factura final (Cláusula 4.1).

## 3. Ecrãs — conflito com a referência visual nova

`referencias visuais/deepseek_html_20260808_481ef9.html` é um mockup de
login gerado externamente, adoptado como direcção visual. **Decisões
fechadas (11/08/2026)**:

1. **Selector de empresa explícito — SIM.** O login terá o selector de
   empresa da referência (substitui a ideia original de formulário único
   sem selector). A empresa escolhida define o tema; o `role`/`is_admin`
   continua a resolver-se de `user_roles` depois da autenticação (o
   selector é UX/tema, não a fonte de verdade da autorização).
2. **Cor: usar a paleta real, não a do mockup.** O mockup usa azul
   Bootstrap `#007bff` / laranja `#fd7e14` — substituir pela paleta já em
   produção no Antigo dashboard: `#2a78d6` (Fuellink) / `#eb6834` (Bakers).
   Não introduzir uma terceira paleta.
3. **"Bonkers Tankers" → "Bankers Tankers"** — corrigir a grafia; nunca
   entra em texto real da aplicação.

**Pendente ainda de decisão** (não bloqueia o esqueleto do ecrã): o
"Forgot Password" da referência — reset feito só pelo Admin, ou activa-se o
fluxo de recuperação padrão do Supabase Auth? ("Sem self-signup" continua a
valer para criação de contas.)

### Sidebar global (decisão fechada 11/08/2026)

Haverá **uma sidebar de navegação global única**, partilhada por todas as
páginas internas, cuja **cor de acento muda consoante a empresa do
utilizador autenticado** (Fuellink `#2a78d6` / Bakers `#eb6834`) — o mesmo
mecanismo de tema por empresa do login. Isto fecha o ponto que estava em
aberto na Secção 9 do handoff. Construir a sidebar como componente único
reutilizável (`public_html/assets/js/core/` + CSS com variável de acento
por empresa), aplicado a partir da primeira página do Mês 1.

## 4. Requisitos não-funcionais (Cláusula 1.3) — estado

| Requisito | Estado |
|---|---|
| Append-only + auditoria | Já provado (`audit_log`, migrações 0001-0003). Estender o mesmo padrão de trigger a toda a tabela nova (`user_permissions`, `documents`, `route_monthly_adjustments`). |
| Validação estrita de tipo de ficheiro | Só existe `accept=` no lado do cliente hoje — não é "estrita". Torna-se obrigatório no Mês 3. |
| HTTPS/TLS em todos os pontos de acesso | Por confirmar no cPanel como parte da checklist de entrega do Mês 1. |
| Acesso responsivo desktop/mobile | Já parcialmente coberto (`@media max-width:720px` no Antigo dashboard). Priorizar mobile-first já no formulário de registo de operação do Mês 2 (Secção 8, princípio 5). |

## 5. Decisões do cliente — estado (fechado 11/08/2026)

1. **Cópia assinada do contrato** — ✅ resolvido: o cliente tem a cópia
   assinada física guardada. O `..._DRAFT.pdf` do repo é só a versão de
   referência.
2. **Modelo de JWT** — ✅ resolvido: modelo **assimétrico (JWKS, ES256)**,
   confirmado pelo endpoint de chaves e pelo cliente. `AuthMiddleware`
   verifica via chave pública, sem segredo partilhado. Falta só a chave
   secreta em `env.php` no servidor.
3. **Desenho do login** — ✅ decidido: **com selector de empresa** (tema por
   empresa), `role` continua a vir de `user_roles`. Ver Secção 3. Sub-ponto
   ainda aberto: fluxo do "Forgot Password".
4. **Múltiplos anexos por operação** — ✅ decidido: **manter 1 documento
   por enquanto**. Revisitar só se surgir necessidade real.
5. **Sidebar de navegação global** — ✅ decidido: **uma sidebar global
   única, cor de acento por empresa autenticada**. Ver Secção 3.

### Ainda por fechar (menor, não bloqueia o Mês 1)

- Fluxo de "Forgot Password": reset só pelo Admin vs recuperação
  self-service do Supabase Auth.

## 6. Regra de entrega

Cada módulo aceite implica handover de código + documentação nesse
momento (Cláusula 3.4) — o repositório tem de estar sempre num estado
entregável no fim de cada mês, não só no Mês 6. Manter os `context.md` de
cada pasta actualizados à medida que cada módulo é construído é o que torna
isso possível sem re-explicar o projecto a cada sessão nova.
