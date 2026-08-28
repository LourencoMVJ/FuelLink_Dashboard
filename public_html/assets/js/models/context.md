# Contexto da Pasta `public_html/assets/js/models`

Camada de acesso a dados (Frontend Model Layer) para comunicação segura com tabelas do Supabase e gestão de fallbacks locais para desenvolvimento/testes.

## Módulos Existentes

- **`transactions.js`** — Responsável por carregar e normalizar os dados de operações, configurações e frotas:
  - Carrega `transactions`, `routes`, `fuellink_settings`, `bakers_settings`, `trucks` e `drivers`.
  - Calcula o estado derivado das operações (**Ativo** vs **Anulado**) com base nas entradas de estorno (`voids_id`).
  - Fornece um conjunto de dados simulados (mock fallback) caso o Supabase esteja offline ou sem registos, permitindo testar filtros de datas e gráficos localmente.
