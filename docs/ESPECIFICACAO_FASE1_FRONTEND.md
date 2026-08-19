# Especificação — Fase 1 (Frontend)

**Fuellink & Bankers Tankers Management Platform · Ref. PFB2607**

> Documento de handoff para o desenvolvedor frontend responsável por
> construir os ecrãs desta primeira fase: **Login, Dashboard, Operações
> Fuellink, Operações Bankers e Detalhe da Operação**. É o resultado de um
> brainstorming de conteúdo (16/08/2026) que reconciliou o que já existe em
> produção (`Antigo dashboard/fuellink-dashboard/index.html`) com uma
> exigência nova: nenhum utilizador de uma empresa pode ver dados comerciais
> da outra.
>
> **O que este documento fixa é o que tem de existir e como se comporta —
> não o pixel a pixel.** Layout exacto, espaçamento, micro-interações e
> composição visual ficam ao critério do eng. de frontend, dentro do design
> system (Secção 2) e dos princípios (Secção 1).
>
> Para o contexto mais amplo do projecto (roadmap de 6 meses, contrato,
> schema completo), ver [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) e
> [ROADMAP_FRONTEND.md](ROADMAP_FRONTEND.md) — este documento é um recorte
> accionável desses dois, focado só no que se constrói nesta fase.

---

## 0. Âmbito desta fase

**Dentro**: Login, Dashboard, Operações Fuellink, Operações Bankers,
Detalhe da Operação (5 ecrãs, 4 páginas HTML — Detalhe é comum na
estrutura aos dois lados).

**Fora** (já tem decisões registadas noutro lado, mas não foi re-verificado
nesta sessão): Gestão de Utilizadores — ver
[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) Secção 9 e
[ROADMAP_FRONTEND.md](ROADMAP_FRONTEND.md) Secção 7.

**Fora, sem spec ainda**: Ledger de Compensação, Módulo
Financeiro/Documental, Definições de conta/perfil.

---

## 1. Princípios que atravessam todos os ecrãs desta fase

1. **Isolamento por empresa (decisão central desta fase)** — nunca mostrar
   dado comercial de uma empresa a um utilizador da outra. Só quem tiver a
   permissão `ledger.view` vê o que cruza as duas empresas (saldo líquido,
   settlements). Isto substitui o modelo do Antigo dashboard, onde qualquer
   conta via tudo.
2. **Role-aware** — esconder (não só desactivar) o que a permissão não
   cobre.
3. **1 HTML + 1 JS view por ecrã** — nada de lógica inline nova como no
   Antigo dashboard.
4. **Nunca a chave secreta no browser** — privilegiado passa sempre por
   `/api/*`.
5. **Validação client-side é só UX** — a validação que conta corre no
   servidor.
6. **Confirmação explícita em acções irreversíveis** (estornar).
7. **Mobile-first** nos formulários de registo de operação.
8. **Cor com significado** (verde=normal, âmbar=pendente, vermelho=atenção),
   nunca decoração.

---

## 2. Design system (resumo — ver [ROADMAP_FRONTEND.md](ROADMAP_FRONTEND.md) Secção 3)

- Paleta: **Fuellink `#2a78d6`** / **Bakers `#eb6834`**. Tema muda consoante
  a empresa — no selector do login, e na cor de acento da sidebar depois de
  autenticado.
- Tipografia: `system-ui, -apple-system, "Segoe UI", sans-serif`.
- **Sidebar global** — um único componente partilhado por todas as páginas
  internas (não o login), cor de acento por empresa.
- Grafia: "Bankers Tankers", nunca "Bonkers Tankers".

---

## 3. Ecrã: Login

- Layout exclusivo, split-screen — não usa a sidebar global.
- **Selector de empresa explícito** — define o tema do ecrã; `role`/
  `is_admin` continuam a resolver-se de `user_roles` **depois** da
  autenticação (o selector é só UX/tema, nunca a fonte de autorização).
- Sem self-signup — só o Admin cria contas.
- **Recuperação de password: self-service via Supabase Auth** (fluxo padrão
  de email, sem intervenção do Admin).

---

## 4. Ecrã: Dashboard

**1 único ecrã** (não dois) — o conteúdo adapta-se à empresa do utilizador
autenticado, como a sidebar. É um resumo, não dois fluxos de trabalho.

**Zona 1 — Filtro**: período + comparação (actual vs período anterior) +
estado.

**Zona 2 — KPIs próprios da empresa (4 cartões, sempre visíveis)**:

| # | Fuellink | Bankers |
|---|---|---|
| 1 | Litros vendidos (período) | Litros transportados (período) |
| 2 | Valor total vendido (período) | Valor total de fornecimento (período) |
| 3 | Nº de operações (período) | Nº de entregas (período) |
| 4 | Preço médio do diesel aplicado (R/L) | Diferença acumulada carregado vs. entregue (litros) |

O KPI 4 da Bankers **depende do Mês 4** (litros entregues ainda não
existe) — mostrar "—" ou ocultar até esse campo existir.

**Zona 2b — Net Position (só visível com permissão `ledger.view`)**:
banner de saldo líquido + descrição de quem deve a quem, e "Settlements
recorded" (total + contagem) — inerentemente cruzado, não pertence a
nenhum dos dois lados sozinho.

**Zona 3 — Gráficos**: sempre visível — tendência própria da empresa
(vendas/fornecimento ao longo do tempo, actual vs período anterior). Só com
`ledger.view` — gráfico de saldo corrente cruzado.

**Zona 4 — Tabela "últimas operações"**: só as operações da **própria**
empresa, mesmas colunas das listas das Secções 5/6.

---

## 5. Ecrã: Operações Fuellink

Página própria (`operations-fuellink.html`), isolada — nunca mostra nada da
Bankers.

**Lista** — colunas: Data · Camião · Motorista (+telefone) · Litros
vendidos · Valor de venda · Prova (✓/✗) · Estado · Nota · Acções.
Filtros: período, camião, ordenação. Sem acções rápidas na linha — editar/
estornar vivem só no Detalhe (Secção 7). Linhas anuladas aparecem
esbatidas.

**"Estado" é derivado, não um campo guardado** — só existe
**Activo / Anulado** (não há `draft`/`submitted` em produção), calculado a
partir de existir ou não uma entrada de estorno a apontar para esta.

**Nova Operação** — campos:

| Campo | Obrigatório | Nota |
|---|---|---|
| Data | sim | |
| Litros vendidos | sim | |
| Camião | sim | texto + sugestões da Fleet |
| Motorista | sim | texto + sugestões da Fleet |
| Trailer/reboque | não | |
| Prova (anexo) | não | upload **inline** no mesmo formulário — reaproveita o padrão já provado do lado Bankers, activado agora também aqui |
| Nota | não | |

**Valor de venda é sempre calculado no servidor** (litros × preço global do
diesel) — nunca um campo editável no formulário.

**Fora do âmbito** (não existem no schema real, sem uso conhecido no
ledger — só entram se pedidos explicitamente): valor de compra do
combustível, valor de aluguer do lado Fuellink.

---

## 6. Ecrã: Operações Bankers

Página própria (`operations-bankers.html`), isolada — nunca mostra nada da
Fuellink (sem valor de venda, sem preço do diesel).

**Lista** — colunas: Data · Camião · Motorista (+telefone) · Trailer ·
Rota · Litros carregados · Litros entregues (Mês 4) · Diferença
(calculado) · Valor de fornecimento · Prova de entrega (✓/✗) · Estado
(mesma regra derivada da Fuellink) · Nota · Acções. Mesmos filtros e regras
de linha que o lado Fuellink.

**Nova Entrega** — campos:

| Campo | Obrigatório | Nota |
|---|---|---|
| Data | sim | |
| Rota | sim | selector |
| Litros carregados | sim | |
| Camião | sim | texto + sugestões da Fleet |
| Motorista | sim | texto + sugestões da Fleet |
| Trailer/reboque | não | |
| Prova de entrega (anexo) | não | upload inline — já existe hoje como padrão |
| Nota | não | |

**Valor de fornecimento é sempre calculado no servidor** (litros × taxa da
rota) — nunca editável na criação. **Litros entregues e diferença ficam
para o ecrã de Detalhe** (Mês 4), não para a criação.

**Edição do valor de fornecimento (assunção de trabalho)**: editar uma
entrega não tem campo de valor livre — edita-se litros/rota e o valor
recalcula automaticamente à taxa congelada na criação. Não introduzir um
campo de override manual nesta fase.

**Ligação a uma operação Fuellink específica: em standby, fora desta fase.**
Litros carregados são digitados directamente pela Bankers, sem picker.

**Sem visibilidade cruzada de estado**: a Fuellink não vê se a sua operação
já foi entregue, e vice-versa.

---

## 7. Ecrã: Detalhe da Operação

Comum na estrutura aos dois lados, conteúdo próprio de cada empresa (nunca
mistura dados das duas). Não existe hoje como ecrã — no Antigo dashboard
isto é um modal por cima da lista.

1. **Cabeçalho** — tipo, estado (Activo/Anulado), data.
2. **Corpo** — os mesmos campos da Lista (Secção 5 ou 6) em modo leitura, +
   prova/prova de entrega com pré-visualização (signed URL).
3. **Editar** (só própria empresa, não anulada, com permissão) — formulário
   inline com os campos editáveis: data, litros, camião, motorista,
   trailer, nota (+ rota e prova de entrega só do lado Bankers). Mostrar
   aviso de taxa congelada ("editar litros recalcula ao valor de criação,
   não ao de hoje").
4. **Estornar** (mesma condição) — botão + confirmação explícita; gera
   entrada reversora; original fica esbatido com "Anulada em [data]".
5. **Bankers apenas (Mês 4)**: é aqui, não na criação, que se preenche
   litros entregues + prova de entrega — a diferença calcula-se
   automaticamente.

**Histórico de alterações: fora do âmbito por agora** (decisão fechada) —
não construir UI para `audit_log` nesta fase.

---

## 8. Catálogo de permissões usado nesta fase

| Código | Onde se usa |
|---|---|
| `operations.create` | Botão "Nova Operação"/"Nova Entrega" |
| `operations.view` | Acesso à Lista/Detalhe Fuellink |
| `operations.edit` | Botão "Editar" no Detalhe Fuellink |
| `operations.void` | Botão "Estornar" no Detalhe Fuellink |
| `operations.upload_proof` | Campo de prova no formulário Fuellink |
| `operations.upload_delivery_proof` | Campo de prova de entrega Bankers |
| `operations.edit_supply_value` | Edição de litros/rota que recalcula o valor de fornecimento |
| `operations.view_fuel_difference` | Ver a diferença carregado/entregue |
| `ledger.view` | Zona 2b/3-cruzada do Dashboard (Net Position, gráfico de saldo) |

Regra geral: nunca gate no cliente sozinho — o servidor volta a verificar
sempre. A distinção Operacional/Sensível é só orientação de UI (pedir
confirmação extra em acções Sensíveis).

---

## 9. Dependências de backend (bloqueiam partes desta fase até existirem)

- **RLS de `SELECT` por empresa em `transactions`** — hoje não existe
  nenhuma política de leitura (confirmado nas migrações 0001-0003); sem
  isto, as Secções 5 e 6 não podem ler dados com segurança. Ver
  [database/migrations/context.md](../database/migrations/context.md).
- **Via privilegiada para leituras cruzadas** (Zona 2b do Dashboard,
  `ledger.view`) — ainda por desenhar (view `SECURITY DEFINER` ou endpoint
  PHP).
- **Cálculo financeiro no servidor** (valor de venda, valor de
  fornecimento) — Mês 2 do backend, ver
  [ROADMAP_BACKEND.md](ROADMAP_BACKEND.md).
- **Extensão do padrão de prova para `type='diesel'`** — as colunas já
  existem (`delivery_note_path`/`name`), só falta activar para este tipo.
- **`transactions.delivered_litres`** (Mês 4, migração `0005`) — sem isto,
  o KPI 4 da Bankers e os campos "litros entregues"/"diferença" no Detalhe
  não têm dados.

---

## 10. Definição de "pronto" (por ecrã)

- [ ] Segue o padrão 1 HTML + 1 JS view.
- [ ] Chama o auth guard no arranque; nenhuma leitura antes da sessão
      confirmada.
- [ ] Nunca mostra dado comercial da outra empresa (Secções 5/6) nem dado
      cruzado sem `ledger.view` (Secção 4).
- [ ] Esconde (não só desactiva) o que a permissão não cobre.
- [ ] Usa a sidebar global e o tema por empresa (excepto login).
- [ ] Escritas privilegiadas vão para `/api/*`.
- [ ] Acção irreversível (estornar) pede confirmação explícita.
- [ ] Testado em pelo menos um breakpoint mobile real.

---

## 11. Assunções a validar em teste de aceitação

- **Edição do valor de fornecimento**: assumimos recálculo via litros/rota
  (sem campo de override manual). Revisitar se a Bankers precisar de
  corrigir um valor sem que os litros tenham mudado.
- **Ligação Fuellink↔Bankers**: em standby — pode voltar à mesa depois
  desta fase.
- **Histórico de alterações no Detalhe**: fora do âmbito — revisitar só se
  pedido explicitamente (exige corrigir primeiro a política RLS do
  `audit_log`, hoje aberta entre empresas).
