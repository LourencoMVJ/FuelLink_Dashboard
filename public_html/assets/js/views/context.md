# Contexto da Pasta `public_html/assets/js/views`

Camada de apresentação e controlo de interface (Frontend View Layer). Cada ficheiro aqui controla exclusivamente uma única página HTML (princípio 1 HTML + 1 JS View).

## Módulos Existentes

- **`login.js`** — Controla a autenticação, botões de alternância de empresa (FuelLink / Bankers Tankers), estados de alerta e redirecionamento pós-login diretamente para `dashboard.html`.
- **`dashboard.js`** — Controla o ecrã do Dashboard:
  - Auth Guard e recuperação da sessão do utilizador.
  - Filtros dinâmicos por período predefinido e **Data Início / Data Fim**.
  - Cálculo e renderização reativa dos 4 KPIs da empresa correspondente.
  - Renderização dos gráficos (Chart.js): Donut de proporção por camião e Linha de tendência temporal com paletas de cores da marca.
  - Renderização da tabela com as 5 transações mais recentes.
- **`operations.js`** — Controla o ecrã de Operações:
  - Mini-KPIs de resumo operacional.
  - Filtros avançados por intervalo de datas, camião e estado (ativo / anulado).
  - Tabela completa de operações da empresa com status de guias e notas.
  - Modal mobile-first para registar novas vendas de combustível (FuelLink) ou entregas de logística (Bankers).
