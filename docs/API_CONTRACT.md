# Contrato de API — para quem constrói o frontend

**Fuellink & Bankers Tankers Management Platform · Ref. PFB2607**

> Cobre os 5 pedidos concretos feitos para acompanhar o desenvolvimento do
> frontend: login, `get_me`, lista/CRUD de operações por empresa,
> pesquisa, e filtros/KPIs. Complementa
> [ROADMAP_BACKEND.md](ROADMAP_BACKEND.md) (arquitectura, Secção 4 tem o
> mapa de rotas interno) e
> [ESPECIFICACAO_FASE1_FRONTEND.md](ESPECIFICACAO_FASE1_FRONTEND.md) (o que
> cada ecrã mostra). Este documento é o contrato accionável: o que chamar,
> com que forma de pedido/resposta.

---

## 0. A regra que decide "PHP ou Supabase directo"

Não é tudo `/api/*`. Metade destes pedidos vai **directo ao Supabase** —
regra do handoff (Secção 6): leituras simples e escritas não-privilegiadas
falam directo com Supabase (RLS trata do isolamento); só o que precisa de
cálculo/integridade a sério passa por PHP.

| Operação | Via | Porquê |
|---|---|---|
| Login/logout/recuperar password | **Supabase directo** | Autenticação é sempre gerida pelo Supabase Auth, nunca pelo PHP |
| `GET /api/me` | **PHP** | Junta `user_roles` + `user_permissions`; simples mas centraliza a forma |
| Listar/pesquisar/filtrar operações | **Supabase directo** | RLS (migração `0004`) já isola por empresa — nenhuma lógica extra precisa de PHP |
| Criar operação | **PHP** | Valor calculado no servidor (litros × preço/taxa) — nunca confiar num valor vindo do cliente |
| Editar operação | **PHP** | Mesma razão — recálculo à taxa congelada tem de ser server-side |
| Estornar operação | **PHP** | Gera a entrada reversora com valores calculados, não recebidos |
| KPIs / resumo do dashboard | **PHP** | Agregação de dinheiro — mantida no mesmo sítio testável (TDD) que o resto do cálculo financeiro |

Envelope de resposta, sempre, em qualquer endpoint `/api/*`:
```json
{ "success": true, "data": { ... }, "error": null, "meta": null }
{ "success": false, "data": null, "error": "mensagem", "meta": null }
```

**Pré-requisito de todos os endpoints `/api/*` e de toda a leitura/escrita
directa em `transactions`**: a migração `0004` tem de ter corrido no
Supabase (ver [database/migrations/context.md](../database/migrations/context.md))
— sem ela, `transactions` não tem RLS de `SELECT`/`INSERT` nenhuma, e
`user_permissions` não existe.

---

## 1. Login (não é `/api/*` — Supabase directo)

```js
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
// data.session.access_token é o JWT usado em todos os pedidos seguintes,
// como header: Authorization: Bearer <access_token>
```

- **Logout**: `supabase.auth.signOut()`.
- **Recuperação de password**: `supabase.auth.resetPasswordForEmail(email)` —
  self-service, decisão fechada (16/08/2026), sem PHP nenhum envolvido.
- **Sem selector de empresa a fazer nada no pedido** — o selector no ecrã de
  login é só tema/UX (decisão 11/08/2026); a empresa real vem de
  `user_roles.role`, resolvida a seguir via `GET /api/me`.
- Refresh de sessão é automático pelo `supabase-js` — nunca reimplementar.

## 2. `GET /api/me` — ✅ implementado

Primeiro pedido a fazer depois do login.

**Pedido**: `GET /api/me`, header `Authorization: Bearer <jwt>`.

**Resposta 200**:
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "email": "waseem@bakers.co.za",
    "role": "bakers",
    "is_admin": true,
    "full_name": "Waseem",
    "phone": "+27123456789",
    "permissions": ["operations.create", "operations.void"]
  },
  "error": null,
  "meta": null
}
```

- `role` = empresa (`bakers`/`fuellink`) — usar para o tema da sidebar.
- `is_admin` — usar só para UI (mostrar o ecrã de Gestão de Utilizadores);
  **nunca a única barreira** de uma acção sensível — o servidor volta a
  verificar sempre via `permissions`.
- `permissions` — lista de códigos concedidos (catálogo em
  [ROADMAP_FRONTEND.md](ROADMAP_FRONTEND.md) Secção 6). Usar para
  esconder (não só desactivar) botões.
- **401** se o JWT for inválido/expirado, **ou** se a conta estiver
  desactivada (`is_active = false`) — a resposta é deliberadamente igual
  nos dois casos, para não revelar qual.

## 3. Listar / Pesquisar / Filtrar operações — Supabase directo

**Não existe endpoint PHP para isto.** A RLS da migração `0004` já garante
que uma sessão Fuellink nunca recebe linhas Bankers e vice-versa, mesmo que
o filtro do pedido não mencione a empresa — por isso nunca precisas de
filtrar `entered_by` tu próprio; o servidor já filtra por ti.

```js
// Operações Fuellink (operations-fuellink.html)
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .eq('type', 'diesel')
  .gte('date', from).lte('date', to)          // filtro de período
  .ilike('detail', `%${searchTerm}%`)          // pesquisa livre (ou .or() para cobrir note também)
  .order('date', { ascending: false })
  .range(offset, offset + pageSize - 1);       // paginação

// Operações Bankers (operations-bankers.html) — mesma forma, type diferente
  .eq('type', 'logistics')
```

**Pesquisa** — `detail` cobre o texto gerado automaticamente (rota, taxa,
camião/motorista); para procurar também por `note`, usar
`.or('detail.ilike.%termo%,note.ilike.%termo%')` em vez de dois `.ilike()`
encadeados (o Supabase encadeia como AND, não OR).

**Filtros disponíveis directamente**: `date` (`.gte`/`.lte`), `truck_id`/
`truck_text` (ou `driver_id`/`driver_text`), `route_id` (só Bankers). Não
há filtro directo por "estado" (ver a seguir) nem pesquisa full-text
avançada — se vier a ser precisa, revisitar com uma `view` dedicada.

**"Estado" (Activo/Anulado) é derivado, não uma coluna** — pedir também as
linhas de estorno e cruzar no cliente, mesmo padrão já usado no Antigo
dashboard:
```js
const { data: voids } = await supabase
  .from('transactions')
  .select('voids_id')
  .eq('type', 'void')
  .eq('voids_type', 'diesel'); // ou 'logistics'

const voidedIds = new Set(voids.map(v => v.voids_id));
// linha é "Anulada" se voidedIds.has(row.id)
```

**Detalhe de uma operação**: mesma via, `GET` directo:
```js
const { data } = await supabase.from('transactions').select('*').eq('id', id).single();
```

**Prova/prova de entrega**: nunca um link directo e permanente —
```js
const { data } = await supabase.storage.from('delivery-notes').createSignedUrl(path, 60);
```

## 4. Criar operação — `POST /api/operations` (Mês 2 — por implementar)

**Pedido** (campos variam por empresa; `type` **nunca** vem do cliente —
deriva-se do `role` do chamador: `fuellink`→`diesel`, `bakers`→`logistics`):

```json
// Fuellink
{ "date": "2026-08-20", "litres": 40000, "truck": "BT123GP", "driver": "John Doe", "trailer": "TR456GP", "note": "" }

// Bankers — acrescenta route_id
{ "date": "2026-08-20", "route_id": "R1", "litres": 40000, "truck": "BT123GP", "driver": "John Doe", "trailer": "TR456GP", "note": "" }
```

**Resposta 201**: a linha criada, incluindo `amount`/`unit_rate` já
**calculados no servidor** — nunca enviar/confiar num valor vindo do
formulário.

**Erros**: `400` litros ausentes/≤0, camião/motorista em falta, rota em
falta (Bankers); `401` sem sessão; `403` sem `operations.create`.

Prova/prova de entrega continuam a ser upload directo ao Storage (Secção
3) — Mês 3/4 acrescenta a validação estrita de tipo de ficheiro no
servidor antes de aceitar o `delivery_note_path` associado.

## 5. Editar operação — `PATCH /api/operations/{id}` (Mês 2 — por implementar)

**Pedido**: subconjunto de `date`, `litres`, `truck`, `driver`, `trailer`,
`note`, `route_id` (só logistics). **Nunca** `amount`/`type`/`entered_by`
directamente — editar `litres`/`route_id` recalcula `amount` no servidor,
à taxa **congelada** (`unit_rate`) da criação, não à taxa de hoje.

**Erros**: `403` se não for o dono (`entered_by` ≠ própria empresa), já
anulada, ou sem `operations.edit`.

## 6. Estornar operação — `POST /api/operations/{id}/void` (Mês 2 — por implementar)

**Pedido**: sem corpo (ou `{ "note": "opcional" }`). Gera a entrada
reversora (`type: 'void'`, `voids_id`, valores invertidos calculados no
servidor); a original nunca é apagada/editada.

**Erros**: `403` se não for o dono, já anulada, ou sem `operations.void`.

## 7. KPIs — `GET /api/operations/summary` (Mês 2 — por implementar)

Reage aos mesmos filtros de período da Zona 1 do Dashboard
([ESPECIFICACAO_FASE1_FRONTEND.md](ESPECIFICACAO_FASE1_FRONTEND.md)
Secção 4). Calculado em PHP (não numa function/view SQL) para ficar no
mesmo sítio testável (TDD) que o resto do cálculo financeiro — ver
[ROADMAP_BACKEND.md](ROADMAP_BACKEND.md) Secção 7.

**Pedido**: `GET /api/operations/summary?from=2026-08-01&to=2026-08-20&compareFrom=2026-07-01&compareTo=2026-07-20`

**Resposta 200** (forma varia por empresa, resolvida do `role` do chamador):
```json
// Fuellink
{
  "litres_sold": 120000, "total_sold": 3313200.00, "operations_count": 4,
  "avg_diesel_price": 27.61,
  "compare": { "litres_sold": 100000, "total_sold": 2761000.00, "operations_count": 3, "avg_diesel_price": 27.61 }
}

// Bankers
{
  "litres_transported": 120000, "total_supply_value": 210000.00, "deliveries_count": 4,
  "delivered_litres_diff": null,
  "compare": { ... }
}
```

`delivered_litres_diff` fica `null` até ao Mês 4 (`litros entregues` ainda
não existe) — o frontend mostra "—", não um erro.

**Net Position / gráfico cruzado (Zona 2b, `ledger.view`) não está neste
endpoint** — cruza as duas empresas, precisa de via privilegiada à parte
(view `SECURITY DEFINER` ou endpoint próprio), ainda por desenhar. Ver
[database/migrations/context.md](../database/migrations/context.md).

---

## 8. Estado de implementação

| Endpoint | Estado |
|---|---|
| Login/logout/recovery (Supabase directo) | ✅ Já funciona hoje (Antigo dashboard usa o mesmo mecanismo) |
| `GET /api/me` | ✅ Implementado, testado (`tests/Unit/Core/AuthMiddlewareTest.php`) |
| Listar/pesquisar/filtrar (Supabase directo) | ⚠️ Depende só da migração `0004` correr — sem código PHP novo necessário |
| `POST /api/operations` | ❌ Por implementar (Mês 2) |
| `PATCH /api/operations/{id}` | ❌ Por implementar (Mês 2) |
| `POST /api/operations/{id}/void` | ❌ Por implementar (Mês 2) |
| `GET /api/operations/summary` | ❌ Por implementar (Mês 2) |

**Ordem sugerida para o developer de frontend**: pode começar já pelo login
+ `GET /api/me` + a lista/pesquisa/filtro de operações (tudo real ou já
implementado, só falta correr a migração `0004`) — os 4 endpoints PHP de
escrita/KPI chegam a seguir, sem bloquear o arranque do resto do ecrã.
