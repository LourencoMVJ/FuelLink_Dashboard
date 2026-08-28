# Contexto da Pasta `public_html/pages`

Contém as páginas HTML correspondentes a cada ecrã da aplicação (1 HTML + 1 JS View por ecrã), seguindo o padrão de isolamento comercial por empresa e design system com liquid glass e mini-dock retrátil.

## Ecrãs Existentes

- **`login.html`** — Ecrã de autenticação com layout split-screen responsivo, seletor de empresa (FuelLink / Bankers Tankers), campos em pill e integração com o core de autenticação modular (`assets/js/core/auth.js`). Suporta login local para testes (`shads@fuelink.co.za` e `shads@bakers.co.za`).
- **`dashboard.html`** — Dashboard único adaptativo que reage dinamicamente ao utilizador autenticado:
  - **FuelLink**: Exibe KPIs de Litros Vendidos (reativo aos filtros de datas), Faturação Total, Nº de Operações e Preço Médio do Diesel. Gráficos com paleta azul.
  - **Bankers Tankers**: Exibe KPIs de Litros Transportados, Valor de Fornecimento, Nº de Entregas e Diferença Carregado/Entregue. Gráficos com paleta laranja.
  - **Filtros**: Permite selecionar períodos predefinidos ou **Data Início** e **Data Fim** customizadas, além de filtro por Camião.
  - **Visualizações**: Gráfico Donut de distribuição por camião, Gráfico de linha de tendência temporal e Tabela das 5 operações mais recentes.
- **`operations.html`** — Ecrã completo de gestão operacional com resumo de mini-KPIs, filtros por intervalo de datas, camião e estado (ativo/anulado), tabela completa com estado de guia/comprovativo e modal mobile-first para registar novas operações/entregas.
