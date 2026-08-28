/**
 * Localization (i18n) & Language Dictionary
 * Supports Portuguese (PT) and English (EN)
 */

export const translations = {
  pt: {
    // Header & Controls
    liveMonitoring: "Monitoramento em Tempo Real",
    overviewSubtitleFL: "Painel de controlo e métricas operacionais para FuelLink",
    overviewSubtitleBT: "Painel de controlo e métricas operacionais para Bankers Tankers",
    opsSubtitleFL: "Histórico e registo de fornecimento de diesel FuelLink",
    opsSubtitleBT: "Gestão de fretes e fornecimento de logística Bankers Tankers",
    opsTitleFL: "Vendas de Combustível",
    opsTitleBT: "Operações de Transporte",
    
    // Sidebar
    dashboard: "Dashboard",
    operations: "Operações",
    operationalManagement: "Gestão Operacional",
    logout: "Terminar Sessão",
    
    // Filters & Actions
    quickPeriod: "Período Rápido",
    allHistory: "Todo o Histórico",
    today: "Hoje",
    thisWeek: "Esta Semana",
    thisMonth: "Este Mês",
    custom: "Personalizado",
    startDate: "Data Início",
    endDate: "Data Fim",
    truck: "Camião / Frota",
    allTrucks: "Todos os Camiões",
    status: "Estado",
    allStatuses: "Todos os Estados",
    activeOnly: "Apenas Ativos",
    voidedOnly: "Deletados",
    applyFilters: "Aplicar Filtros",
    filter: "Filtrar",
    reset: "Limpar",
    searchPlaceholder: "Pesquisar operações por camião, motorista, rota ou nota...",
    refresh: "Atualizar Dados",
    refreshTooltip: "Clique para recarregar os dados da tabela em tempo real",
    exportData: "Exportar Relatório",
    exportBtn: "Exportar",
    
    // KPIs FuelLink
    litresSold: "Litros Vendidos",
    totalSoldValue: "Valor Total Vendido",
    operationsCount: "Nº de Operações",
    logisticsFeesLabel: "Taxas de Logística (Devidas à Bakers)",
    kpiHauled: "transportados",
    avgDieselPrice: "Preço Médio Diesel",
    kpiVolumeTag: "Volume",
    kpiRandsTag: "Rands",
    kpiSalesTag: "Vendas",
    kpiPriceTag: "R / Litro",
    kpiReactiveDate: "Reativo ao filtro de datas",
    kpiCalculatedBilling: "Faturação calculada",
    kpiActiveOps: "Operações ativas",
    kpiAvgPeriod: "Média aplicada no período",
    kpiTripsTag: "Viagens",
    kpiNormalTag: "Normal",
    kpiSelectedPeriod: "No período selecionado",
    kpiAccumulatedTotal: "Total acumulado",
    kpiRegisteredDeliveries: "Entregas registadas",
    kpiMonth4: "Mês 4",
    kpiAwaitingDelivered: "Aguardando campo entregue",
    
    // KPIs Bankers
    litresHauled: "Litros Transportados",
    totalSupplyValue: "Valor de Fornecimento",
    deliveriesCount: "Nº de Entregas",
    fuelDiff: "Diferença Carregado/Entregue",
    
    // Dashboard Sections & Charts
    netPositionTitle: "Posição Líquida Cruzada (Compensação)",
    netPositionDesc: "Balanço corrente entre FuelLink e Bankers Tankers",
    netPositionOwedToFuelLink: "A Bakers deve à FuelLink (o valor líquido do diesel excede as taxas de logística + acertos)",
    netPositionOwedToBakers: "A FuelLink deve à Bakers (as taxas de logística + acertos excedem o valor do diesel)",
    netPositionSettled: "Contas acertadas — sem saldo em aberto",
    donutTitle: "Volume por Mês",
    donutSubtitle: "Litros vendidos em cada mês do ano",
    trendTitle: "Tendência Temporal",
    trendSubtitle: "Evolução do volume ao longo do período selecionado",
    recentOpsTitle: "Últimas 5 Operações",
    recentOpsSubtitle: "Histórico recente correspondente aos filtros aplicados",
    viewAllOps: "Ver Todas as Operações",
    chartVolumeLabel: "Volume em Litros",
    noChartData: "Sem registos",
    
    // Operations Summary
    totalVolumeFilter: "Volume Total (Filtro)",
    totalBilling: "Faturação Acumulada",
    totalRecords: "Total de Registos",
    
    // Table Headers
    date: "Data",
    truckCol: "Camião",
    driver: "Motorista",
    trailer: "Trailer",
    route: "Rota",
    litres: "Litros",
    litresLoaded: "Litros Carregados",
    litresSoldCol: "Litros Vendidos",
    orderAmount: "Ordem (L)",
    orderAmountFull: "Volume Encomendado (Ordem)",
    orderProof: "Comp. Ordem",
    loadedAmount: "Carregado (L)",
    loadedAmountFull: "Volume Carregado",
    loadedProof: "Comp. Carregamento",
    offloadedAmount: "Descarregado (L)",
    offloadedAmountFull: "Volume Descarregado (Entregue)",
    offloadedProof: "Comp. Descarregamento",
    differenceCol: "Diferença (L)",
    deliveryValueCol: "Valor a Entregar",
    value: "Valor",
    valueR: "Valor",
    saleValue: "Valor Venda",
    saleValueR: "Valor Venda",
    proof: "Comprovativo",
    proofDelivery: "Guia",
    proofAttached: "Comprovativo Anexado",
    proofMissing: "Sem Comprovativo",
    actions: "Ações",
    note: "Nota",
    statusCol: "Estado",
    activeStatus: "Ativo",
    voidedStatus: "Deletado",
    noDataFound: "Nenhum registo encontrado com os filtros selecionados.",
    noActions: "Sem ações",
    
    // Actions & Buttons
    viewDetails: "Ver Detalhes",
    backToOps: "Voltar às Operações",
    opDetailsTitle: "Detalhes da Operação",
    opDetailsSubtitle: "Informações completas, métricas e comprovativos da transação",
    generalInfo: "Informações Gerais",
    volumesFinancial: "Volumes e Financeiro",
    attachedDocuments: "Documentos e Comprovativos",
    noDocAttached: "Nenhum documento anexado",
    viewFile: "Visualizar",
    downloadFile: "Descarregar",
    opNotFound: "Operação não encontrada.",
    printReport: "Imprimir / PDF",
    newOperationFL: "Nova Operação",
    newOperationBT: "Nova Entrega",
    edit: "Editar",
    voidAction: "Deletar",
    deleteConfirm: "Tem certeza que deseja deletar este registo? Esta ação não pode ser desfeita.",
    deleteSuccess: "Registo deletado com sucesso!",
    deleteError: "Erro ao deletar registo: ",
    save: "Gravar Registo",
    saveChanges: "Salvar Alterações",
    cancel: "Cancelar",
    close: "Fechar",
    saving: "A gravar...",
    fillRequired: "Por favor, preencha todos os campos obrigatórios.",
    
    // Modal Nova Operação / Entrega
    modalTitleNewFL: "Registar Nova Operação de Diesel",
    modalTitleNewBT: "Registar Nova Entrega (Bankers)",
    modalTitleEdit: "Editar Registo",
    labelOpDate: "Data da Operação *",
    labelRoute: "Rota *",
    labelLitresSold: "Litros Vendidos *",
    labelLitresLoaded: "Litros Carregados *",
    labelTruck: "Camião (Matrícula) *",
    labelDriver: "Motorista *",
    labelTrailer: "Reboque / Trela (Opcional)",
    labelNote: "Nota / Referência",
    labelProof: "Comprovativo / Guia de Entrega (Opcional)",
    
    // Export Modal
    exportTitle: "Exportar Relatório de Operações",
    exportDesc: "Selecione o formato para exportar os registos atualmente filtrados na tabela:",
    exportExcel: "Ficheiro Excel (.csv / .xlsx)",
    exportExcelDesc: "Planilha detalhada formatada para cálculos e conciliação.",
    exportPdf: "Documento PDF (.pdf)",
    exportPdfDesc: "Layout profissional pronto para impressão e auditoria.",
    exportWord: "Documento Word (.doc)",
    exportWordDesc: "Relatório corporativo editável estruturado em tabelas.",
    downloadBtn: "Transferir Ficheiro",
    
    // Login Translations
    loginTitle: "Gestão Integrada de",
    loginSubtitle: "Painel centralizado de operações, reconciliação de viagens e controlo financeiro em tempo real.",
    welcomeBack: "Bem-vindo de volta",
    signInTitle: "Iniciar Sessão",
    signInSubtitle: "Introduza as suas credenciais para aceder",
    accessAs: "Aceder como",
    emailPlaceholder: "Email institucional",
    passwordPlaceholder: "Palavra-passe",
    rememberMe: "Lembrar-me",
    forgotPassword: "Esqueceu a senha?",
    signInBtn: "Entrar",
    authenticating: "A validar credenciais...",
    authenticatedSuccess: "Autenticado com sucesso!",
    supportPrompt: "Precisa de uma conta ou apoio técnico?",
    contactSupport: "Contactar Suporte",
    fillEmail: "Por favor, introduza o seu email institucional.",
    fillPassword: "Por favor, introduza a sua palavra-passe.",
    invalidCredentials: "Email ou palavra-passe incorretos. Por favor, verifique e tente novamente.",
    
    // Pagination
    showing: "A mostrar",
    to: "a",
    of: "de",
    records: "registos",
    page: "Página",
    prevPage: "Anterior",
    nextPage: "Seguinte"
  },
  en: {
    // Header & Controls
    liveMonitoring: "Real-Time Monitoring",
    overviewSubtitleFL: "Operational metrics and performance overview for FuelLink",
    overviewSubtitleBT: "Operational metrics and performance overview for Bankers Tankers",
    opsSubtitleFL: "History and recording of FuelLink diesel sales",
    opsSubtitleBT: "Freight and logistics management for Bankers Tankers",
    opsTitleFL: "Fuel Sales & Operations",
    opsTitleBT: "Transport Logistics Operations",
    
    // Sidebar
    dashboard: "Dashboard",
    operations: "Operations",
    operationalManagement: "Operations Mgmt",
    logout: "Sign Out",
    
    // Filters & Actions
    quickPeriod: "Quick Period",
    allHistory: "All History",
    today: "Today",
    thisWeek: "This Week",
    thisMonth: "This Month",
    custom: "Custom Range",
    startDate: "Start Date",
    endDate: "End Date",
    truck: "Truck / Fleet",
    allTrucks: "All Trucks",
    status: "Status",
    allStatuses: "All Statuses",
    activeOnly: "Active Only",
    voidedOnly: "Deleted",
    applyFilters: "Apply Filters",
    filter: "Filter",
    reset: "Clear",
    searchPlaceholder: "Search operations by truck, driver, route or note...",
    refresh: "Refresh Data",
    refreshTooltip: "Click to refresh table data in real time",
    exportData: "Export Report",
    exportBtn: "Export",
    
    // KPIs FuelLink
    litresSold: "Litres Sold",
    totalSoldValue: "Total Sales Value",
    operationsCount: "No. of Operations",
    logisticsFeesLabel: "Logistics Fees (Bakers Owed)",
    kpiHauled: "hauled",
    avgDieselPrice: "Avg Diesel Price",
    kpiVolumeTag: "Volume",
    kpiRandsTag: "Rands",
    kpiSalesTag: "Sales",
    kpiPriceTag: "R / Litre",
    kpiReactiveDate: "Reactive to date filters",
    kpiCalculatedBilling: "Calculated invoicing",
    kpiActiveOps: "Active operations",
    kpiAvgPeriod: "Average applied in period",
    kpiTripsTag: "Trips",
    kpiNormalTag: "Normal",
    kpiSelectedPeriod: "In selected period",
    kpiAccumulatedTotal: "Accumulated total",
    kpiRegisteredDeliveries: "Recorded deliveries",
    kpiMonth4: "Month 4",
    kpiAwaitingDelivered: "Awaiting delivered volume field",
    
    // KPIs Bankers
    litresHauled: "Litres Transported",
    totalSupplyValue: "Supply Value",
    deliveriesCount: "No. of Deliveries",
    fuelDiff: "Loaded vs Delivered Diff",
    
    // Dashboard Sections & Charts
    netPositionTitle: "Cross Net Settlement Position",
    netPositionDesc: "Current ledger balance between FuelLink and Bankers Tankers",
    netPositionOwedToFuelLink: "Bakers owes Fuel Link (net diesel value exceeds logistics fees + settlements)",
    netPositionOwedToBakers: "Fuel Link owes Bakers (net logistics fees + settlements exceed diesel value)",
    netPositionSettled: "Settled — no balance owing either way",
    donutTitle: "Volume by Month",
    donutSubtitle: "Litres sold in each month of the year",
    trendTitle: "Time Trend",
    trendSubtitle: "Volume evolution over the selected period",
    recentOpsTitle: "Latest 5 Operations",
    recentOpsSubtitle: "Recent history matching current filter criteria",
    viewAllOps: "View All Operations",
    chartVolumeLabel: "Volume in Litres",
    noChartData: "No records",
    
    // Operations Summary
    totalVolumeFilter: "Total Volume (Filter)",
    totalBilling: "Accumulated Invoicing",
    totalRecords: "Total Records",
    
    // Table Headers
    date: "Date",
    truckCol: "Truck",
    driver: "Driver",
    trailer: "Trailer",
    route: "Route",
    litres: "Litres",
    litresLoaded: "Litres Loaded",
    litresSoldCol: "Litres Sold",
    orderAmount: "Order (L)",
    orderAmountFull: "Order Amount",
    orderProof: "Order Proof",
    loadedAmount: "Loaded (L)",
    loadedAmountFull: "Loaded Amount",
    loadedProof: "Loading Proof",
    offloadedAmount: "Offloaded (L)",
    offloadedAmountFull: "Offloaded Amount",
    offloadedProof: "Offloading Proof",
    differenceCol: "Diff (L)",
    deliveryValueCol: "Payable Value",
    value: "Amount",
    valueR: "Amount",
    saleValue: "Sale Amount",
    saleValueR: "Sale Amount",
    proof: "Proof",
    proofDelivery: "Delivery Note",
    proofAttached: "Proof Attached",
    proofMissing: "No Proof",
    actions: "Actions",
    note: "Note",
    statusCol: "Status",
    activeStatus: "Active",
    voidedStatus: "Deleted",
    noDataFound: "No records found matching current filters.",
    noActions: "No actions",
    
    // Actions & Buttons
    viewDetails: "View Details",
    backToOps: "Back to Operations",
    opDetailsTitle: "Operation Details",
    opDetailsSubtitle: "Comprehensive data, volumes, and attached proofs",
    generalInfo: "General Information",
    volumesFinancial: "Volumes & Financials",
    attachedDocuments: "Attached Documents & Proofs",
    noDocAttached: "No document attached",
    viewFile: "View",
    downloadFile: "Download",
    opNotFound: "Operation not found.",
    printReport: "Print / PDF",
    newOperationFL: "New Operation",
    newOperationBT: "New Delivery",
    edit: "Edit",
    voidAction: "Delete",
    deleteConfirm: "Are you sure you want to delete this record? This action cannot be undone.",
    deleteSuccess: "Record successfully deleted!",
    deleteError: "Error deleting record: ",
    save: "Save Record",
    saveChanges: "Save Changes",
    cancel: "Cancel",
    close: "Close",
    saving: "Saving...",
    fillRequired: "Please fill in all required fields.",
    
    // Modal New Operation / Delivery
    modalTitleNewFL: "Record New Fuel Operation",
    modalTitleNewBT: "Record New Delivery (Bankers)",
    modalTitleEdit: "Edit Record",
    labelOpDate: "Operation Date *",
    labelRoute: "Route *",
    labelLitresSold: "Litres Sold *",
    labelLitresLoaded: "Litres Loaded *",
    labelTruck: "Truck (Plate) *",
    labelDriver: "Driver *",
    labelTrailer: "Trailer (Optional)",
    labelNote: "Reference / Note",
    labelProof: "Proof of Delivery / Note (Optional)",
    
    // Export Modal
    exportTitle: "Export Operations Report",
    exportDesc: "Select format to export the currently filtered table records:",
    exportExcel: "Excel Spreadsheet (.csv / .xlsx)",
    exportExcelDesc: "Detailed spreadsheet formatted for accounting and calculations.",
    exportPdf: "PDF Document (.pdf)",
    exportPdfDesc: "Print-ready professional layout for audit and archiving.",
    exportWord: "Word Document (.doc)",
    exportWordDesc: "Editable corporate report document structured in tables.",
    downloadBtn: "Download File",
    
    // Login Translations
    loginTitle: "Integrated Management of",
    loginSubtitle: "Centralized operations dashboard, trip reconciliation and real-time financial control.",
    welcomeBack: "Welcome back",
    signInTitle: "Sign In",
    signInSubtitle: "Enter your credentials to access the platform",
    accessAs: "Access as",
    emailPlaceholder: "Corporate email",
    passwordPlaceholder: "Password",
    rememberMe: "Remember me",
    forgotPassword: "Forgot password?",
    signInBtn: "Sign In",
    authenticating: "Validating credentials...",
    authenticatedSuccess: "Successfully authenticated!",
    supportPrompt: "Need an account or technical assistance?",
    contactSupport: "Contact Support",
    fillEmail: "Please enter your corporate email.",
    fillPassword: "Please enter your password.",
    invalidCredentials: "Incorrect email or password. Please verify and try again.",
    
    // Pagination
    showing: "Showing",
    to: "to",
    of: "of",
    records: "records",
    page: "Page",
    prevPage: "Previous",
    nextPage: "Next"
  }
};

export function getCurrentLanguage() {
  return localStorage.getItem('app_lang') || 'pt';
}

export function setLanguage(lang) {
  localStorage.setItem('app_lang', lang);
  window.location.reload();
}

export function t(key) {
  const lang = getCurrentLanguage();
  return translations[lang]?.[key] || translations['pt']?.[key] || key;
}

export function getCurrentTheme() {
  return localStorage.getItem('app_theme') || 'light';
}

export function setTheme(theme) {
  localStorage.setItem('app_theme', theme);
  applyTheme(theme);
}

export function applyTheme(theme = getCurrentTheme()) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
}

/**
 * Initializes and renders the Theme & Language toggles in any designated container
 * @param {string} containerId 
 */
export function initHeaderControls(containerId = 'headerControls') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const currentTheme = getCurrentTheme();
  const currentLang = getCurrentLanguage();

  container.innerHTML = `
    <div class="header-toggles-wrap">
      <!-- Language Selector Toggle -->
      <div class="pill-toggle-group" role="group" aria-label="Idioma / Language">
        <button type="button" class="pill-toggle-btn ${currentLang === 'pt' ? 'active' : ''}" data-lang="pt" title="Português">
          <span>PT</span>
        </button>
        <button type="button" class="pill-toggle-btn ${currentLang === 'en' ? 'active' : ''}" data-lang="en" title="English">
          <span>EN</span>
        </button>
      </div>

      <!-- Theme Selector Toggle (Light / Dark) -->
      <div class="pill-toggle-group" role="group" aria-label="Tema / Theme">
        <button type="button" class="pill-toggle-btn ${currentTheme === 'light' ? 'active' : ''}" data-theme-val="light" title="Modo Claro / Light Mode">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        </button>
        <button type="button" class="pill-toggle-btn ${currentTheme === 'dark' ? 'active' : ''}" data-theme-val="dark" title="Modo Escuro / Dark Mode">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Language Click Handlers
  container.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = btn.getAttribute('data-lang');
      if (selected !== currentLang) {
        setLanguage(selected);
      }
    });
  });

  // Theme Click Handlers
  container.querySelectorAll('[data-theme-val]').forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedTheme = btn.getAttribute('data-theme-val');
      setTheme(selectedTheme);
      container.querySelectorAll('[data-theme-val]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Apply initial theme and language attribute
  applyTheme();
  document.documentElement.lang = currentLang;
}
