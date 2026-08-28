# Contexto da Pasta `public_html/assets/js/core`

Camada de serviços essenciais e componentes globais partilhados entre as páginas do frontend.

## Módulos Existentes

- **`auth.js`** — Serviço de autenticação e gestão de sessão:
  - Integração com o Supabase Auth para login via email e palavra-passe.
  - Suporte a contas locais de teste sem conexão obrigatória à nuvem (`shads@fuelink.co.za` e `shads@bakers.co.za`).
  - Resolução do perfil/empresa (`user_roles`) e armazenamento local da sessão ativa.
  - Função de logout (`signOut`).
- **`sidebar.js`** — Componente global da Sidebar:
  - Renderiza o menu de navegação com estado ativo da página atual.
  - Aplica o tema dinâmico e iniciais do perfil da empresa autenticada.
  - Suporte a recolher/expandir o menu (modo Mini-Dock) através do clique no cabeçalho/logo da sidebar, persistindo o estado no `localStorage`.
