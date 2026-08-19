# Contexto do Projeto — Fuellink & Bankers Tankers Management Platform

**Ref. PFB2607 · Lomavi Industrie, Su, LDA**

> Este documento é o handoff completo de uma fase de arquitetura/idealização feita
> em conversa (Claude.ai) para continuação em Claude Code. É a soma de todas as
> decisões, dados reais, e pontos em aberto discutidos até essa fase — nem tudo o
> que descreve como "por fazer" continua por fazer; ver os `context.md` de cada
> pasta (Secção 11) e [database/migrations/context.md](../database/migrations/context.md)
> para o estado real e mais actual. Em caso de conflito entre este documento e o
> código/schema real, **o código/schema real vence**.
>
> Os 7 pontos de reconciliação da Secção 5 têm agora resolução concreta (ou
> pendência de decisão do cliente explicitamente marcada) em
> [docs/PROPOSTA_DESENVOLVIMENTO.md](PROPOSTA_DESENVOLVIMENTO.md), que também
> quebra os 6 meses do contrato em entregáveis técnicos — ler esse documento
> antes de começar a implementar qualquer módulo.

---

## 1. Modelo de negócio e contexto do cliente

- **Cliente legal**: RWENDO SERVIÇOS LDA (NUIT 401279202, Maputo, Moçambique),
  representada por **Malcolm Kapondera** (COO). Opera sob a marca **Fuellink**.
- **Segunda entidade**: **Bankers Tankers (Pty) Ltd** — empresa legalmente
  **separada** da Fuellink, mas com relação de negócio directa e contínua com
  ela.
- **Developer**: Lomavi Industrie, SU, LDA (reg. 105077801, São Damasso,
  Matola), representada por Lourenço Vilanculo Jr, CEO.
- **Relação de negócio entre as duas empresas**:
  - **Fuellink** vende combustível (diesel) — fixa um preço global por litro
    (não por rota).
  - **Bankers Tankers** transporta/entrega esse combustível — cobra uma taxa
    de logística/aluguer por rota (baseada em payload, distância, e um
    ajuste mensal de combustível).
  - As duas fluxos de dinheiro (venda de diesel vs. taxa de transporte) são
    **compensados num livro-razão partilhado** (offset ledger) — o sistema
    mantém uma **posição líquida** de quem deve a quem, actualizada em tempo
    real, com possibilidade de "settlement" (liquidação) para zerar a
    diferença.
  - Um protótipo funcional deste ledger **já existe e está em produção**
    (Supabase) — ver Secção 3. O trabalho contratado é a **evolução** deste
    protótipo para uma plataforma de gestão completa, não uma reconstrução
    do zero.

## 2. Contrato — termos que regem o trabalho

Contrato assinado em 25 de Julho de 2026 (Ref. PFB2607). Pontos que afectam
directamente como o trabalho deve ser conduzido:

- **Entrega incremental, 1 módulo por mês, 6 meses**:

  | Mês | Módulo |
  |---|---|
  | 1 | Gestão de utilizadores e permissões (Admin / User) |
  | 2 | Rastreio operacional Fuellink (camião, motorista, litros, valores) |
  | 3 | Upload de provas por operação + testes do módulo Fuellink |
  | 4 | Extensão Bankers (prova de entrega, diferença carregado/entregue, edição de fornecimento) |
  | 5 | Módulo financeiro/documental (facturas, cotações, recibos, notas de crédito, carimbo digital) |
  | 6 | Testes integrados, ajustes finais, documentação, formação |

- **Honorários**: 16.666 MT/mês + IVA (fixo, cobre desenvolvimento + gestão +
  manutenção), durante os 6 meses. Mês 1 pago na assinatura; meses seguintes
  só após aceitação do módulo anterior.
- **Aceitação**: cliente tem 7 dias úteis para aceitar/rejeitar cada módulo
  (por escrito); sem rejeição em 7 dias = aceite tacitamente.
- **Cláusula 1.4 (negociada por nós)**: pedidos de reordenação de módulos ou
  âmbito adicional exigem avaliação escrita do Developer em 5 dias úteis;
  reordenar módulos ainda não iniciados = grátis; âmbito novo ou retrabalho
  de módulos já aceites = orçamentado à parte.
- **Handover de código**: código-fonte + documentação de cada módulo entregam
  -se ao repositório do cliente **mediante aceitação desse módulo** (não só
  no fim) — implica manter o repositório sempre entregável/limpo ao fim de
  cada mês.
- **Propriedade intelectual**: transfere-se **totalmente para o cliente**
  após o pagamento da factura final (Mês 6). Ferramentas/bibliotecas
  pré-existentes do Developer continuam próprias, com licença de uso ao
  cliente.
- **Garantia**: 3 meses grátis após aceitação do módulo final; depois,
  manutenção paga (mesma mensalidade).
- **Infraestrutura**: corre **exclusivamente nas contas já existentes do
  cliente** — Supabase e GoDaddy (cPanel com hospedagem PHP confirmada). O
  Developer **nunca cria infraestrutura fora do controlo do cliente**, nem
  mantém cópias independentes dos dados do cliente.
- **Lei aplicável**: Moçambique, foro de Maputo.

## 3. Esquema real da base de dados (produção, no momento deste handoff)

O cliente partilhou o esquema **real** do Supabase já em uso (protótipo
funcional que precede este contrato). Isto era o estado no momento do
handoff — desde então, as migrações 0001-0003 já correram; ver
[database/migrations/context.md](../database/migrations/context.md) para o
estado actual.

```sql
CREATE TABLE public.user_roles (
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['bakers'::text, 'fuellink'::text])),
  CONSTRAINT user_roles_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.routes (
  id text NOT NULL,
  from_point text NOT NULL,
  to_point text NOT NULL,
  cargo text NOT NULL DEFAULT 'DSL'::text,
  payload numeric NOT NULL,
  adj_may numeric NOT NULL DEFAULT 0,
  adj_june numeric NOT NULL DEFAULT 0,
  adj_july numeric NOT NULL DEFAULT 0,
  base_rate numeric NOT NULL DEFAULT 0,
  CONSTRAINT routes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.fuellink_settings (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  diesel_price numeric NOT NULL DEFAULT 27.61,
  CONSTRAINT fuellink_settings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.bakers_settings (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  month text NOT NULL DEFAULT 'july'::text,
  CONSTRAINT bakers_settings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  date date NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['logistics'::text, 'diesel'::text, 'settlement'::text, 'void'::text])),
  amount numeric NOT NULL,
  balance_delta numeric NOT NULL,
  litres numeric,
  route_id text,
  entered_by text NOT NULL CHECK (entered_by = ANY (ARRAY['bakers'::text, 'fuellink'::text])),
  note text,
  detail text NOT NULL,
  voids_id uuid,
  voids_type text,
  truck_id uuid,
  driver_id uuid,
  delivery_note_path text,
  delivery_note_name text,
  trailer_reg text,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id),
  CONSTRAINT transactions_voids_id_fkey FOREIGN KEY (voids_id) REFERENCES public.transactions(id),
  CONSTRAINT transactions_truck_id_fkey FOREIGN KEY (truck_id) REFERENCES public.trucks(id),
  CONSTRAINT transactions_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id)
);

CREATE TABLE public.trucks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reg_number text NOT NULL UNIQUE,
  description text,
  created_by text NOT NULL CHECK (created_by = ANY (ARRAY['bakers'::text, 'fuellink'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT trucks_pkey PRIMARY KEY (id)
);

CREATE TABLE public.drivers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  license_number text,
  phone text,
  created_by text NOT NULL CHECK (created_by = ANY (ARRAY['bakers'::text, 'fuellink'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT drivers_pkey PRIMARY KEY (id)
);
```

### Como ler este esquema (regras de negócio implícitas nos dados)

- **`user_roles.role`** = a **empresa** do utilizador (`bakers`/`fuellink`),
  NÃO um papel Admin/User. Hoje só existem 2 contas (uma por empresa) — é
  isso que o Mês 1 vai expandir.
- **`transactions`** é o **ledger partilhado único** — todas as operações
  (venda de diesel, logística, liquidação, estorno) vivem na mesma tabela,
  distinguidas por `type`. Estorno é feito via `voids_id`/`voids_type`
  (nunca UPDATE/DELETE directo no modelo original) — o princípio append-only
  já estava em produção antes deste handoff; as migrações 0001-0003
  introduziram uma excepção de UPDATE estreita e auditada por cima disso
  (ver Secção 5, ponto 3, e o context.md das migrações).
- **`routes`** tem colunas de ajuste **fixas por mês** (`adj_may`,
  `adj_june`, `adj_july`) — cada mês novo exige `ALTER TABLE` para
  acrescentar coluna. `bakers_settings.month` decide qual coluna se aplica
  no cálculo da taxa (`base_rate + adj_<mês activo>`).
- **`fuellink_settings.diesel_price`** = preço global do diesel, usado nas
  transacções `type = 'diesel'`. Não depende de rota.
- **`trucks`** e **`drivers`** já eram entidades normalizadas e reutilizáveis
  (não texto livre) neste ponto — `reg_number` é único. Ver Secção 5, ponto 2
  para como isto evoluiu.
- **`trailer_reg`** foi adicionado por pedido do cliente **depois** da
  discussão inicial — confirma que camião (unidade tractora) e reboque têm
  matrículas distintas e ambas precisam de registo.
- **Prova de entrega** já vive directamente em `transactions`
  (`delivery_note_path`, `delivery_note_name`) — não é uma tabela de anexos
  separada.

## 4. Modelo "greenfield" desenhado em conversa (PRÉ-existência do esquema real)

Isto foi desenhado **antes** de sabermos do esquema real (Secção 3). Fica
registado porque a lógica de negócio e os princípios continuam válidos —
mas a **estrutura de tabelas tem de ser reconciliada com a Secção 3**, não
implementada por cima às cegas.

### Tabelas desenhadas
- `roles` (id smallint, name, description) — catálogo de papéis (admin/user),
  extensível sem migração.
- `profiles` (id uuid → auth.users, company, role_id → roles, full_name,
  phone, is_active, created_by, created_at, updated_at).
- `user_permissions` (id, user_id → profiles, permission text livre,
  granted boolean, granted_by, updated_at; `UNIQUE(user_id, permission)`) —
  **todas** as permissões passam por aqui, incluindo as sensíveis (decisão
  explícita do cliente: quer controlo e supervisão total, mesmo sobre ações
  admin-only).
- `operations` (id bigint, company, truck_plate, driver_full_name,
  rental_value, litres_sold, sale_value, fuel_purchase_cost, status
  [`draft`/`submitted`/`void`], created_by, created_at, updated_at) —
  pensada para o Mês 2 (Fuellink), extensível ao Mês 4 (Bankers).
- `operation_attachments` (id, operation_id, attachment_type
  [`proof`/`delivery_proof`], file_path, file_type, file_size_bytes,
  uploaded_by, uploaded_at) — permite múltiplos anexos por operação;
  operação pode ficar sem prova (decisão do cliente).

### Catálogo de permissões (a manter como documentação viva, sem `check`
rígido na BD — cresce a cada módulo):

| Código | Módulo | Natureza |
|---|---|---|
| `operations.create` | Fuellink | Operacional |
| `operations.upload_proof` | Fuellink | Operacional |
| `operations.view` | Fuellink | Operacional |
| `operations.edit` | Fuellink | Sensível |
| `operations.void` | Fuellink | Sensível |
| `operations.upload_delivery_proof` | Bankers | Operacional |
| `operations.edit_supply_value` | Bankers | Sensível |
| `operations.view_fuel_difference` | Bankers | Operacional |
| `ledger.view` | Ledger | Operacional |
| `ledger.add_transaction` | Ledger | Sensível |
| `ledger.void_transaction` | Ledger | Sensível |
| `routes.edit_price` | Ledger | Sensível |
| `documents.generate_invoice/quotation/receipt/credit_note` | Financeiro | Sensível |
| `documents.view` | Financeiro | Operacional |

Filosofia: **tudo é tecnicamente delegável** pelo Admin, incluindo ações
sensíveis — a distinção Operacional/Sensível é só orientação de UI (pedir
confirmação extra ao ligar algo "Sensível"), nunca uma restrição rígida no
código ou na BD.

## 5. Pontos de reconciliação — estado no momento deste handoff

Estes eram conflitos reais entre a Secção 3 (produção) e a Secção 4
(desenho novo), nenhum resolvido no momento em que este documento foi
escrito. **Desde então, os pontos 2 e 5 já foram resolvidos em código** —
ver [database/migrations/context.md](../database/migrations/context.md)
para o estado actual e definitivo. Os restantes continuam em aberto.

1. **Company vs Role** *(ainda em aberto)*: `user_roles` só guarda a
   empresa. Precisamos de acrescentar o conceito Admin/User sem quebrar as
   2 contas já existentes — provavelmente uma nova coluna/tabela ligada a
   `user_roles`, não uma tabela `profiles` paralela e desconectada.
2. **Trucks/Drivers estruturados vs texto livre** — ***resolvido***: migração
   0002 implementou o modelo híbrido (texto livre com correspondência
   opcional à Fleet existente, sem criação automática de novos registos).
3. **Ledger único (`transactions`) vs `operations` por empresa** *(ainda em
   aberto)*: a produção usa uma tabela partilhada com `type`; o desenho
   greenfield tinha `operations` separada do ledger. Decidir se `operations`
   (Mês 2) é uma tabela nova que alimenta `transactions`, ou se continuamos
   a escrever directamente em `transactions`.
4. **Anexos** *(ainda em aberto)*: produção guarda 1 prova de entrega
   directo em `transactions` (`delivery_note_path`/`name`); o desenho
   greenfield tinha `operation_attachments` para múltiplos ficheiros.
   Decidir se se migra para tabela própria (mais flexível) ou se mantemos o
   padrão actual (mais simples, 1 ficheiro só).
5. **`trailer_reg`** — ***resolvido***: migração 0001 adicionou-o como campo
   de texto livre directamente em `transactions`.
6. **`routes` com colunas por mês** *(ainda em aberto)*: não urgente, mas por
   resolver eventualmente — sugestão: `route_monthly_adjustments(route_id,
   month, adj_value)`.
7. **`user_permissions` (catálogo fino) não existe ainda em produção**
   *(ainda em aberto)* — é 100% trabalho novo do Mês 1, tem de se integrar
   com `user_roles` sem quebrar o que já funciona para os 2 admins actuais.

## 6. Stack técnica decidida

| Camada | Escolha | Porquê |
|---|---|---|
| Frontend | HTML, CSS, JS puro (sem framework) | Preferência do developer |
| Backend privilegiado | PHP, em MVC (Controllers/Models/Core) | Corre no cPanel GoDaddy já existente do cliente |
| BD / Auth / Storage | Supabase (projecto já existente do cliente) | Já em produção, sem custo de infra novo |
| Hospedagem | GoDaddy (cPanel confirmado com suporte PHP) | Já paga pelo cliente |

### Regra de arquitetura (repetir em qualquer sessão nova de código)
- **Leituras simples e operações não-privilegiadas** → frontend fala
  directo com Supabase (chave pública/`anon`/`publishable`), protegido por
  RLS.
- **Operações privilegiadas** (criar utilizador, gerar PDF com numeração
  sequencial, qualquer coisa que precise da chave secreta) → passam sempre
  pelo PHP em `public_html/api/`, nunca directo do browser.
- **Autenticação no PHP**: usar verificação de JWT via **JWKS assimétrico**
  (chave pública, sem segredo partilhado) — **não** o modelo legacy HS256
  com `SUPABASE_JWT_SECRET`. Confirmar no painel do cliente
  (Settings → API → JWT Keys) se o projecto já está no modelo novo
  (`sb_publishable_...`/`sb_secret_...`) antes de escrever
  `AuthMiddleware.php`.
- **Nunca** criar infraestrutura fora de Supabase/GoDaddy (cláusula
  contratual 6.2).

## 7. Estrutura de pastas (MVC)

```
fuellink-bankers-platform/
│
├── private/                          ← FORA do document root (cPanel)
│   ├── config/                        chaves reais (env.php, git-ignored)
│   └── app/
│       ├── Controllers/               1 por área: recebe pedido, chama Model, devolve JSON
│       ├── Models/                    1 por tabela: fala com a API REST do Supabase
│       └── Core/                      SupabaseClient, AuthMiddleware, Router
│
├── public_html/                      ← document root do cPanel
│   ├── api/                           front controller único (/api/*)
│   ├── pages/                         1 HTML por ecrã
│   └── assets/
│       ├── css/                       base + tema por empresa (fuellink/bankers)
│       ├── js/
│       │   ├── config/                 supabase-client.js (chave pública)
│       │   ├── core/                    auth guard, cliente API partilhado
│       │   ├── models/                  acesso directo a dados (leituras, via RLS)
│       │   └── views/                   1 ficheiro por página
│       └── img/
│
├── database/
│   └── migrations/                    SQL versionado, corrido manualmente no Supabase
│
└── docs/
    ├── proposal/                      Proposta comercial PT/EN (PFB2607)
    └── contract/                      Contrato assinado
```

**Nota de deployment**: `public_html/` = document root do cPanel;
`private/` fica **ao lado**, nunca dentro de `public_html/`.

## 8. Princípios de UI/UX (validados com pesquisa + decisão do cliente)

Pesquisados e cruzados em 3 domínios: frota/logística, fintech/ledger,
SaaS B2B multi-tenant. Aplicar em todos os ecrãs:

1. **Densidade de informação > minimalismo decorativo** — hierarquia em
   camadas (poucos números grandes no topo, resto atrás de detalhe), não
   espaço em branco generoso.
2. **Interface consciente do papel (role-aware)** — o mesmo ecrã muda
   consoante quem o vê; esconder o que não se pode fazer, não só
   desactivar.
3. **Estado e histórico sempre visíveis** — cada registo mostra o seu
   estado (draft/submitted/void) e rasto de "quem fez o quê, quando" —
   requisito de auditabilidade, não decoração.
4. **Confirmação explícita em ações irreversíveis** — fricção é sinal de
   confiança em fluxos financeiros, não um defeito de UX a eliminar.
5. **Mobile-first onde há trabalho de terreno** — formulários de registo de
   operação usados junto ao camião, dedos grandes, pouco scroll.
6. **Cor com significado, nunca decoração** — verde=normal/aceite,
   âmbar=pendente/a dever, vermelho=precisa de atenção — consistente em
   toda a app.

## 9. Ecrãs — decisões já fechadas (idealização, nada construído neste
momento do handoff)

### Login (layout exclusivo, não se repete nas páginas internas)
- Split-screen: painel esquerdo com **marca do cliente** (Fuellink — ícone
  gota+ligação criado do zero, azul `#185FA5`/`#042C53`, dado que a Fuellink
  não tem brand guidelines formais), painel direito com formulário.
- **Um único formulário de login** — sem selector de empresa; `company` e
  `role` resolvem-se a partir do perfil, depois da autenticação.
- **Sem self-signup** — só o Admin cria contas.

### Dashboard — **revisto (16/08/2026)**, ver [ROADMAP_FRONTEND.md](ROADMAP_FRONTEND.md) Secção 7
A ideia original desta secção (1 ecrã totalmente partilhado, "isolamento
fica para o futuro") foi **substituída**: a mesma separação por empresa
decidida para as Operações aplica-se agora também ao Dashboard — KPIs
próprios de cada empresa sempre visíveis, o que cruza as duas (Net
Position, gráfico de saldo) só visível a quem tiver `ledger.view`. O
"isolamento para o futuro" que ficou registado aqui como decisão do cliente
está, portanto, **resolvido** — não continua em aberto. Especificação
completa (4 KPIs por lado, zonas, gating) no `ROADMAP_FRONTEND.md`.

### Gestão de Utilizadores (Mês 1)
- Tabela (avatar, nome+email, telefone, role badge, estado
  activo/inactivo + toggle, **"Criado em"**, ícone de editar) + painel de
  permissões ao lado, agrupado em **Operacional** vs **Sensível — requer
  confirmação**, com rasto de auditoria visível ("última alteração: quem,
  quando, o quê").
- **Sem ícone de apagar** — nunca se apaga um utilizador, só se desactiva
  (`is_active`), consistente com append-only.
- Filtros (papel, estado), pesquisa, ordenação, botão "+ Adicionar
  utilizador".
- **Sidebar de navegação global**: decisão **ainda em aberto** no momento
  deste handoff — ver [public_html/pages/context.md](../public_html/pages/context.md)
  para o estado actual.

### Lista de Operações — **revisto (16/08/2026)**, ver [ROADMAP_FRONTEND.md](ROADMAP_FRONTEND.md) Secção 7
A ideia original desta secção (1 ecrã "Lista de Operações" Mês 2, só
Fuellink, colunas Data/Camião/Motorista/Litros/Valor venda/Aluguer/Prova/
Estado) foi **substituída** depois de se identificar que uma lista
partilhada expõe dados comerciais de uma empresa aos Users da outra. Decisão
actual: **dois ecrãs separados e mutuamente isolados**
(`operations-fuellink.html` / `operations-bankers.html`), cada um só com os
campos da sua própria empresa; o cruzamento entre as duas fica exclusivo do
Ledger de Compensação. Especificação completa (campos, colunas, formulários
de criação) no `ROADMAP_FRONTEND.md`, não repetida aqui.

### Por desenhar ainda (inventário completo) — **revisto (16/08/2026)**
"Registar nova Operação", "Detalhe de uma Operação" e "Extensão Bankers"
desta lista original já têm spec fechada — ver
[ROADMAP_FRONTEND.md](ROADMAP_FRONTEND.md) Secção 7. Continuam por desenhar:
- Ledger de Compensação (redesign do que já existe em produção)
- Módulo Financeiro/Documental (lista de documentos, gerar, pré-visualizar
  PDF)
- Definições de conta/perfil

## 10. Documentos de referência

Ver [docs/context.md](context.md) para a localização actual e ficheiros.

---

## 11. O que colocar em cada `context.md` (por directório)

Cada pasta relevante da estrutura (Secção 7) deve manter um `context.md`
próprio — pequeno, actualizado à medida que o código é escrito, para dar a
qualquer sessão futura do Claude Code contexto imediato **sem reler este
documento inteiro**. Regra geral: um `context.md` diz **o que vive aqui, que
regras se aplicam só aqui, e o que NÃO fazer aqui** — não repete o que já
está neste documento principal. Estes já foram criados; ver cada pasta.

## 12. Como continuar a partir daqui

Ordem sugerida de trabalho:
1. Resolver os pontos de reconciliação ainda em aberto na Secção 5
   (idealmente confirmando com o cliente/CEO os que exigem decisão de
   negócio, não só técnica) — pontos 1, 3, 4, 6, 7.
2. **Não recriar migrações para o que já está em produção** (pontos 2 e 5,
   e todo o sistema de edição/auditoria de 0001-0003) — só reconciliar o
   que falta.
3. Construir o Mês 1 (gestão de utilizadores/permissões) sobre o
   `user_roles` real, não sobre uma tabela `profiles` paralela.
4. Seguir o inventário de ecrãs da Secção 9, na ordem do plano de entrega
   (Secção 2), mantendo o `context.md` de cada pasta actualizado à medida
   que essa parte é implementada.
