import { getSession } from '../core/auth.js';
import { initSidebar } from '../core/sidebar.js';
import { initHeaderControls, t, getCurrentLanguage } from '../core/i18n.js';
import { fetchCompanyData } from '../models/transactions.js';
import { api } from '../core/api.js';

let rawData = null;
let currentSession = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 10;
let selectedExportFormat = 'excel';
let editingTransactionId = null;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Operations DOMContentLoaded triggered');

  // 1. Auth Guard (with robust local fallback)
  try {
    currentSession = await getSession();
  } catch (err) {
    console.warn('getSession error:', err);
  }

  if (!currentSession || !currentSession.session) {
    const localRole = localStorage.getItem('fuellink_current_role') || 'fuellink';
    currentSession = {
      role: localRole,
      session: { user: { email: localRole === 'bakers' ? 'shads@bakers.co.za' : 'shads@fuelink.co.za' } }
    };
  }

  // 2. Initialize Header Toggles, Sidebar & Screen Branding
  try {
    initHeaderControls('headerControls');
  } catch (e) {
    console.warn('initHeaderControls error:', e);
  }

  try {
    initSidebar('operations', currentSession);
  } catch (e) {
    console.warn('initSidebar error:', e);
  }

  try {
    setupScreenBranding(currentSession);
  } catch (e) {
    console.warn('setupScreenBranding error:', e);
  }

  // 3. Load & Render Data
  try {
    await loadAndRender();
  } catch (e) {
    console.error('loadAndRender error:', e);
  }

  // 4. Setup Listeners (Filters, Search, Export & Modal)
  try {
    setupEventListeners();
  } catch (e) {
    console.warn('setupEventListeners error:', e);
  }
});

function setupScreenBranding(session) {
  const role = session.role || 'fuellink';
  const isBakers = role === 'bakers';

  document.documentElement.setAttribute('data-company', role);
  // Toggle body class for scoped branding (Bankers orange vs FuelLink blue)
  if (isBakers) {
    document.body.classList.add('role-bakers');
    document.body.classList.remove('role-fuellink');
  } else {
    document.body.classList.add('role-fuellink');
    document.body.classList.remove('role-bakers');
  }

  const opsTitle = document.getElementById('opsTitle');
  const opsSubtitle = document.getElementById('opsSubtitle');
  const btnNewOpText = document.getElementById('btnNewOpText');
  const btnOpenModal = document.getElementById('btnOpenNewOpModal');
  const modalTitle = document.getElementById('modalTitleText');
  const litresLabel = document.getElementById('newOpLitresLabel');
  const routeField = document.getElementById('newOpRouteField');

  // KPI Summary Cards Labels & Brand Palette
  const card1 = document.getElementById('opsKpiCard1');
  const card2 = document.getElementById('opsKpiCard2');
  const card3 = document.getElementById('opsKpiCard3');

  if (card1 && card2 && card3) {
    if (isBakers) {
      card1.className = 'kpi-card bakers';
      card2.className = 'kpi-card bakers';
      card3.className = 'kpi-card bakers';
    } else {
      card1.className = 'kpi-card fuellink';
      card2.className = 'kpi-card fuellink';
      card3.className = 'kpi-card fuellink';
    }
  }

  const lblKpiVolume = document.getElementById('lblKpiVolume');
  const tagKpiVolume = document.getElementById('tagKpiVolume');
  const unitKpiLitres = document.getElementById('unitKpiLitres');
  const footKpiVolume = document.getElementById('footKpiVolume');

  const lblKpiBilling = document.getElementById('lblKpiBilling');
  const tagKpiRands = document.getElementById('tagKpiRands');
  const footKpiBilling = document.getElementById('footKpiBilling');

  const lblKpiRecords = document.getElementById('lblKpiRecords');
  const tagKpiTrips = document.getElementById('tagKpiTrips');
  const unitKpiOps = document.getElementById('unitKpiOps');
  const footKpiRecords = document.getElementById('footKpiRecords');

  if (lblKpiVolume) lblKpiVolume.textContent = isBakers ? t('litresHauled') : t('litresSold');
  if (tagKpiVolume) tagKpiVolume.textContent = t('kpiVolumeTag');
  if (unitKpiLitres) unitKpiLitres.textContent = t('litres');
  if (footKpiVolume) footKpiVolume.textContent = t('kpiSelectedPeriod');

  if (lblKpiBilling) lblKpiBilling.textContent = isBakers ? t('totalSupplyValue') : t('totalSoldValue');
  if (tagKpiRands) tagKpiRands.textContent = t('kpiRandsTag');
  if (footKpiBilling) footKpiBilling.textContent = t('kpiCalculatedBilling');

  if (lblKpiRecords) lblKpiRecords.textContent = isBakers ? t('deliveriesCount') : t('operationsCount');
  if (tagKpiTrips) tagKpiTrips.textContent = isBakers ? t('kpiTripsTag') : t('kpiSalesTag');
  if (unitKpiOps) unitKpiOps.textContent = t('operations');
  if (footKpiRecords) footKpiRecords.textContent = t('kpiRegisteredDeliveries');

  // Filter labels
  const lblOpsStartDate = document.getElementById('lblOpsStartDate');
  const lblOpsEndDate = document.getElementById('lblOpsEndDate');
  const lblOpsTruck = document.getElementById('lblOpsTruck');
  const lblStatus = document.getElementById('lblOpsStatus');
  const btnFilterText = document.getElementById('btnFilterText');
  const searchInput = document.getElementById('opsSearchInput');
  const optAll = document.getElementById('optStatusAll');
  const optActive = document.getElementById('optStatusActive');
  const optVoided = document.getElementById('optStatusVoided');
  const btnReset = document.getElementById('btnResetOpsFilters');
  const btnExportText = document.getElementById('btnExportText');
  const tableSectionTitle = document.getElementById('tableSectionTitle');
  const refreshTooltipText = document.getElementById('refreshTooltipText');
  const btnRefreshOps = document.getElementById('btnRefreshOps');

  if (lblOpsStartDate) lblOpsStartDate.textContent = t('startDate');
  if (lblOpsEndDate) lblOpsEndDate.textContent = t('endDate');
  if (lblOpsTruck) lblOpsTruck.textContent = t('truck');
  if (lblStatus) lblStatus.textContent = t('status');
  if (btnFilterText) btnFilterText.textContent = t('filter');
  if (btnReset) btnReset.textContent = t('reset');
  if (btnExportText) btnExportText.textContent = t('exportBtn');
  if (searchInput) searchInput.placeholder = t('searchPlaceholder');
  if (optAll) optAll.textContent = t('allStatuses');
  if (optActive) optActive.textContent = t('activeOnly');
  if (optVoided) optVoided.textContent = t('voidedOnly');
  if (tableSectionTitle) tableSectionTitle.textContent = role === 'bakers' ? t('opsTitleBT') : t('opsTitleFL');
  if (refreshTooltipText) refreshTooltipText.textContent = t('refreshTooltip');

  // Export Modal Translations
  const exportModalTitle = document.getElementById('exportModalTitle');
  const exportModalSubtitle = document.getElementById('exportModalSubtitle');
  const lblExportExcel = document.getElementById('lblExportExcel');
  const lblExportExcelDesc = document.getElementById('lblExportExcelDesc');
  const lblExportPdf = document.getElementById('lblExportPdf');
  const lblExportPdfDesc = document.getElementById('lblExportPdfDesc');
  const lblExportWord = document.getElementById('lblExportWord');
  const lblExportWordDesc = document.getElementById('lblExportWordDesc');
  const btnCancelExport = document.getElementById('btnCancelExport');
  const btnExecuteExport = document.getElementById('btnExecuteExport');

  if (exportModalTitle) exportModalTitle.textContent = t('exportTitle');
  if (exportModalSubtitle) exportModalSubtitle.textContent = t('exportDesc');
  if (lblExportExcel) lblExportExcel.textContent = t('exportExcel');
  if (lblExportExcelDesc) lblExportExcelDesc.textContent = t('exportExcelDesc');
  if (lblExportPdf) lblExportPdf.textContent = t('exportPdf');
  if (lblExportPdfDesc) lblExportPdfDesc.textContent = t('exportPdfDesc');
  if (lblExportWord) lblExportWord.textContent = t('exportWord');
  if (lblExportWordDesc) lblExportWordDesc.textContent = t('exportWordDesc');
  if (btnCancelExport) btnCancelExport.textContent = t('cancel');
  if (btnExecuteExport) btnExecuteExport.textContent = t('downloadBtn');

  // Modal Input Labels
  const lblOpDate = document.getElementById('lblOpDate');
  const lblOpRoute = document.getElementById('lblOpRoute');
  const lblOpTruck = document.getElementById('lblOpTruck');
  const lblOpDriver = document.getElementById('lblOpDriver');
  const lblOpTrailer = document.getElementById('lblOpTrailer');
  const lblOpNote = document.getElementById('lblOpNote');
  const lblOpProof = document.getElementById('newOpProofLabel');
  const btnCancelModal = document.getElementById('btnCancelModal');

  // Bankers Specific Modal Elements
  const bakersVolumesRow = document.getElementById('bakersVolumesFieldRow');
  const bakersProofsRow = document.getElementById('bakersProofsFieldRow');
  const flProofField = document.getElementById('flProofField');
  const flLitresField = document.getElementById('newOpLitresField');

  const lblOpOrderAmount = document.getElementById('lblOpOrderAmount');
  const lblOpLoadedAmount = document.getElementById('lblOpLoadedAmount');
  const lblOpOffloadedAmount = document.getElementById('lblOpOffloadedAmount');
  const lblOpOrderProof = document.getElementById('lblOpOrderProof');
  const lblOpLoadedProof = document.getElementById('lblOpLoadedProof');
  const lblOpOffloadedProof = document.getElementById('lblOpOffloadedProof');

  if (lblOpDate) lblOpDate.textContent = t('labelOpDate');
  if (lblOpRoute) lblOpRoute.textContent = t('labelRoute');
  if (lblOpTruck) lblOpTruck.textContent = t('labelTruck');
  if (lblOpDriver) lblOpDriver.textContent = t('labelDriver');
  if (lblOpTrailer) lblOpTrailer.textContent = t('labelTrailer');
  if (lblOpNote) lblOpNote.textContent = t('labelNote');
  if (lblOpProof) lblOpProof.textContent = t('labelProof');
  if (btnCancelModal) btnCancelModal.textContent = t('cancel');

  if (lblOpOrderAmount) lblOpOrderAmount.textContent = t('orderAmountFull') + ' *';
  if (lblOpLoadedAmount) lblOpLoadedAmount.textContent = t('loadedAmountFull') + ' *';
  if (lblOpOffloadedAmount) lblOpOffloadedAmount.textContent = t('offloadedAmountFull') + ' *';
  if (lblOpOrderProof) lblOpOrderProof.textContent = t('orderProof');
  if (lblOpLoadedProof) lblOpLoadedProof.textContent = t('loadedProof');
  if (lblOpOffloadedProof) lblOpOffloadedProof.textContent = t('offloadedProof');

  if (opsTitle) opsTitle.textContent = t('operationalManagement');

  if (isBakers) {
    if (opsSubtitle) opsSubtitle.textContent = t('opsSubtitleBT');
    if (tableSectionTitle) tableSectionTitle.textContent = t('opsTitleBT');
    if (btnNewOpText) btnNewOpText.textContent = t('newOperationBT');
    if (btnOpenModal) btnOpenModal.classList.add('bakers');
    if (modalTitle) modalTitle.textContent = t('modalTitleNewBT');
    if (routeField) routeField.style.display = 'flex';
    if (flLitresField) flLitresField.style.display = 'none';
    if (bakersVolumesRow) bakersVolumesRow.style.display = 'grid';
    if (flProofField) flProofField.style.display = 'none';
    if (bakersProofsRow) bakersProofsRow.style.display = 'grid';
  } else {
    if (opsSubtitle) opsSubtitle.textContent = t('opsSubtitleFL');
    if (tableSectionTitle) tableSectionTitle.textContent = t('opsTitleFL');
    if (btnNewOpText) btnNewOpText.textContent = t('newOperationFL');
    if (btnOpenModal) btnOpenModal.classList.remove('bakers');
    if (modalTitle) modalTitle.textContent = t('modalTitleNewFL');
    if (routeField) routeField.style.display = 'none';
    if (flLitresField) flLitresField.style.display = 'flex';
    if (bakersVolumesRow) bakersVolumesRow.style.display = 'none';
    if (flProofField) flProofField.style.display = 'flex';
    if (bakersProofsRow) bakersProofsRow.style.display = 'none';
  }
}

function setupEventListeners() {
  const applyBtn = document.getElementById('btnApplyOpsFilters');
  const resetBtn = document.getElementById('btnResetOpsFilters');
  const refreshBtn = document.getElementById('btnRefreshOps');
  const searchInput = document.getElementById('opsSearchInput');
  const openModalBtn = document.getElementById('btnOpenNewOpModal');
  const closeModalBtn = document.getElementById('btnCloseModal');
  const cancelModalBtn = document.getElementById('btnCancelModal');
  const modal = document.getElementById('newOperationModal');
  const form = document.getElementById('newOperationForm');

  // Export Modal Elements
  const openExportBtn = document.getElementById('btnOpenExportModal');
  const closeExportBtn = document.getElementById('btnCloseExportModal');
  const cancelExportBtn = document.getElementById('btnCancelExport');
  const exportModal = document.getElementById('exportModal');
  const executeExportBtn = document.getElementById('btnExecuteExport');
  const exportFormatCards = document.querySelectorAll('.export-format-card');

  // Filter and Search Actions
  applyBtn?.addEventListener('click', () => {
    currentPage = 1;
    renderOperations();
  });

  searchInput?.addEventListener('input', () => {
    currentPage = 1;
    renderOperations();
  });

  refreshBtn?.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    await loadAndRender();
    refreshBtn.disabled = false;
  });

  resetBtn?.addEventListener('click', () => {
    const sDate = document.getElementById('opsStartDate');
    const eDate = document.getElementById('opsEndDate');
    const truck = document.getElementById('opsTruckFilter');
    const status = document.getElementById('opsStatusFilter');
    const search = document.getElementById('opsSearchInput');

    if (sDate) sDate.value = '';
    if (eDate) eDate.value = '';
    if (truck) truck.value = '';
    if (status) status.value = 'all';
    if (search) search.value = '';

    currentPage = 1;
    renderOperations();
  });

  // Modal Create / Edit
  openModalBtn?.addEventListener('click', () => {
    editingTransactionId = null;
    document.getElementById('modalTitleText').textContent = (currentSession.role === 'bakers') ? t('modalTitleNewBT') : t('modalTitleNewFL');
    document.getElementById('btnSubmitOp').textContent = t('save');
    form.reset();
    const dateInput = document.getElementById('newOpDate');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    modal.classList.add('show');
  });

  closeModalBtn?.addEventListener('click', () => modal.classList.remove('show'));
  cancelModalBtn?.addEventListener('click', () => modal.classList.remove('show'));

  // Export Modal Handlers
  openExportBtn?.addEventListener('click', () => exportModal?.classList.add('show'));
  closeExportBtn?.addEventListener('click', () => exportModal?.classList.remove('show'));
  cancelExportBtn?.addEventListener('click', () => exportModal?.classList.remove('show'));

  exportFormatCards.forEach(card => {
    card.addEventListener('click', () => {
      exportFormatCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedExportFormat = card.getAttribute('data-format');
    });
  });

  executeExportBtn?.addEventListener('click', () => {
    handleExportData(selectedExportFormat);
    exportModal?.classList.remove('show');
  });

  // Form submission
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleSaveOperation();
  });
}

async function loadAndRender() {
  try {
    rawData = await fetchCompanyData(currentSession.role);
    populateDropdowns();
    renderOperations();
  } catch (err) {
    console.error('Error loading operations data:', err);
  }
}

function populateDropdowns() {
  if (!rawData) return;

  const truckFilter = document.getElementById('opsTruckFilter');
  const trucksList = document.getElementById('trucksList');
  const driversList = document.getElementById('driversList');
  const routeSelect = document.getElementById('newOpRoute');

  if (truckFilter) {
    truckFilter.innerHTML = `<option value="">${t('allTrucks')}</option>`;
    rawData.trucks.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.reg_number;
      opt.textContent = t.reg_number + (t.description ? ` (${t.description})` : '');
      truckFilter.appendChild(opt);
    });
  }

  if (trucksList) {
    trucksList.innerHTML = rawData.trucks.map(t => `<option value="${t.reg_number}">${t.description || ''}</option>`).join('');
  }

  if (driversList) {
    driversList.innerHTML = rawData.drivers.map(d => `<option value="${d.name}">Licença: ${d.license_number || 'N/A'}</option>`).join('');
  }

  if (routeSelect && rawData.routes) {
    routeSelect.innerHTML = rawData.routes.map(r => {
      return `<option value="${r.id}">${r.from} → ${r.to} (${r.cargo} - Base R ${r.baseRate})</option>`;
    }).join('');
  }
}

function getFilteredOperations() {
  if (!rawData || !rawData.transactions) return [];

  const role = currentSession?.role || 'fuellink';
  const startDate = document.getElementById('opsStartDate')?.value;
  const endDate = document.getElementById('opsEndDate')?.value;
  const truck = document.getElementById('opsTruckFilter')?.value;
  const statusFilter = document.getElementById('opsStatusFilter')?.value || 'all';
  const query = (document.getElementById('opsSearchInput')?.value || '').trim().toLowerCase();

  const allowedType = role === 'bakers' ? 'logistics' : 'diesel';

  return rawData.transactions.filter(t => {
    // If testing or transactions available, show appropriate type
    if (t.type && t.type !== allowedType) return false;
    if (truck && t.truck !== truck) return false;
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;

    if (statusFilter === 'active' && t.status !== 'active') return false;
    if (statusFilter === 'voided' && t.status !== 'voided') return false;

    // Search query filter (truck, driver, note, trailer, route)
    if (query) {
      const match = (t.truck || '').toLowerCase().includes(query) ||
                    (t.driver || '').toLowerCase().includes(query) ||
                    (t.note || '').toLowerCase().includes(query) ||
                    (t.trailer || '').toLowerCase().includes(query) ||
                    (t.date || '').toLowerCase().includes(query);
      if (!match) return false;
    }

    return true;
  });
}

function renderOperations() {
  const allFiltered = getFilteredOperations();
  const role = currentSession?.role || 'fuellink';
  const currentLang = getCurrentLanguage();

  // 1. Update KPI Summary Cards
  const activeTxs = allFiltered.filter(t => t.status === 'active');
  const totalLitres = activeTxs.reduce((sum, t) => sum + (t.litres || 0), 0);
  const totalValue = activeTxs.reduce((sum, t) => sum + (t.amount || 0), 0);

  const elTotalLitres = document.getElementById('summaryTotalLitres');
  const elTotalValue = document.getElementById('summaryTotalValue');
  const elTotalCount = document.getElementById('summaryTotalCount');

  if (elTotalLitres) elTotalLitres.textContent = totalLitres.toLocaleString('pt-PT');
  if (elTotalValue) elTotalValue.textContent = `R ${totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (elTotalCount) elTotalCount.textContent = activeTxs.length.toString();

  // 2. Pagination Calculations (10 per page)
  const totalItems = allFiltered.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = allFiltered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // 3. Render Table
  const thead = document.getElementById('operationsTableHead');
  const tbody = document.getElementById('operationsTableBody');
  if (!thead || !tbody) return;

  if (role === 'bakers') {
    thead.innerHTML = `
      <th>${t('date')}</th>
      <th>${t('truckCol')}</th>
      <th>${t('driver')}</th>
      <th>${t('trailer')}</th>
      <th>${t('route')}</th>
      <th style="text-align: right;">${t('orderAmount')}</th>
      <th style="text-align: right;">${t('loadedAmount')}</th>
      <th style="text-align: right;">${t('offloadedAmount')}</th>
      <th style="text-align: right;">${t('differenceCol')}</th>
      <th style="text-align: right;">${t('deliveryValueCol')}</th>
      <th style="text-align: center;">${t('statusCol')}</th>
      <th>${t('note')}</th>
      <th style="text-align: center;">${t('actions')}</th>
    `;
  } else {
    thead.innerHTML = `
      <th>${t('date')}</th>
      <th>${t('truckCol')}</th>
      <th>${t('driver')}</th>
      <th>${t('trailer')}</th>
      <th style="text-align: right;">${t('litresSoldCol')}</th>
      <th style="text-align: right;">${t('saleValue')}</th>
      <th style="text-align: center;">${t('proof')}</th>
      <th style="text-align: center;">${t('statusCol')}</th>
      <th>${t('note')}</th>
      <th style="text-align: center;">${t('actions')}</th>
    `;
  }

  if (totalItems === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="13" style="text-align: center; color: #94A3B8; padding: 36px;">
          ${t('noDataFound')}
        </td>
      </tr>
    `;
    renderPagination(0, 0, 0, 1);
    return;
  }

  const routeMap = {};
  (rawData.routes || []).forEach(r => { 
    routeMap[r.id] = {
      from: r.from,
      to: r.to,
      baseRate: r.baseRate,
      html: `<div class="route-stacked-cell"><span class="route-from">${r.from}</span><span class="route-arrow">↓</span><span class="route-to">${r.to}</span></div>`
    }; 
  });

  tbody.innerHTML = pageItems.map(tItem => {
    const isVoided = tItem.status === 'voided';
    const statusBadge = isVoided
      ? `<span class="table-badge voided">${t('voidedStatus')}</span>`
      : `<span class="table-badge active">${t('activeStatus')}</span>`;

    const proofEl = tItem.deliveryNotePath
      ? `<span class="proof-status-badge verified" title="${t('proofAttached')}">✓</span>`
      : `<span class="proof-status-badge missing" title="${t('proofMissing')}">✕</span>`;

    const actionsHtml = `
      <div class="row-actions-group">
        <button type="button" class="btn-row-action view" data-view-id="${tItem.id}" aria-label="${t('viewDetails')}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <span class="action-tooltip">${t('viewDetails')}</span>
        </button>
        ${!isVoided ? `
          <button type="button" class="btn-row-action edit" data-edit-id="${tItem.id}" aria-label="${t('edit')}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            <span class="action-tooltip">${t('edit')}</span>
          </button>
          <button type="button" class="btn-row-action void" data-void-id="${tItem.id}" aria-label="${t('voidAction')}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span class="action-tooltip">${t('voidAction')}</span>
          </button>
        ` : ''}
      </div>
    `;

    if (role === 'bakers') {
      const routeInfo = routeMap[tItem.routeId];
      const routeHtml = routeInfo ? routeInfo.html : '—';

      const orderAmt = Number(tItem.orderAmount || tItem.litres || 0);
      const loadedAmt = Number(tItem.loadedAmount || tItem.litres || 0);
      const offloadedAmt = Number(tItem.offloadedAmount || tItem.litres || 0);
      const diffVal = loadedAmt - offloadedAmt;

      const diffDisplay = diffVal > 0
        ? `<span class="diff-danger-value">-${diffVal.toLocaleString('pt-PT')}&nbsp;L</span>`
        : (diffVal === 0 ? `<span class="diff-zero-value">0&nbsp;L</span>` : `<span class="diff-zero-value">+${Math.abs(diffVal).toLocaleString('pt-PT')}&nbsp;L</span>`);

      // Prefer the server's frozen delivery_value (offloaded_amount * this
      // operation's own unit_rate at creation time). Falls back to
      // offloaded_amount * the route's CURRENT rate — an estimate, not the
      // frozen figure — only for operations that predate migration 0008 and
      // have no stored delivery_value, using the route_id link every
      // operation already has.
      const deliveryValue = tItem.deliveryValue != null
        ? tItem.deliveryValue
        : offloadedAmt * (routeInfo ? (routeInfo.baseRate || 0) : 0);
      const formattedDeliveryValue = `R&nbsp;${deliveryValue.toLocaleString(currentLang === 'pt' ? 'pt-PT' : 'en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      return `
        <tr class="${isVoided ? 'tr-voided' : ''}">
          <td style="font-weight: 600;">${tItem.date}</td>
          <td><b>${tItem.truck || '—'}</b></td>
          <td>${tItem.driver || '—'}</td>
          <td>${tItem.trailer || '—'}</td>
          <td>${routeHtml}</td>
          <td style="text-align: right; font-weight: 600;">${orderAmt.toLocaleString('pt-PT')}&nbsp;L</td>
          <td style="text-align: right; font-weight: 600;">${loadedAmt.toLocaleString('pt-PT')}&nbsp;L</td>
          <td style="text-align: right; font-weight: 600;">${offloadedAmt.toLocaleString('pt-PT')}&nbsp;L</td>
          <td style="text-align: right;">${diffDisplay}</td>
          <td style="text-align: right; font-weight: 700; white-space: nowrap;">${formattedDeliveryValue}</td>
          <td style="text-align: center;">${statusBadge}</td>
          <td class="op-note-cell">${tItem.note || '—'}</td>
          <td style="text-align: center;">${actionsHtml}</td>
        </tr>
      `;
    } else {
      const formattedAmount = (tItem.amount || 0).toLocaleString(currentLang === 'pt' ? 'pt-PT' : 'en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `
        <tr class="${isVoided ? 'tr-voided' : ''}">
          <td style="font-weight: 600;">${tItem.date}</td>
          <td><b>${tItem.truck || '—'}</b></td>
          <td>${tItem.driver || '—'}</td>
          <td>${tItem.trailer || '—'}</td>
          <td style="text-align: right; font-weight: 600;">${(tItem.litres || 0).toLocaleString('pt-PT')}&nbsp;L</td>
          <td style="text-align: right; font-weight: 700; white-space: nowrap;">R&nbsp;${formattedAmount}</td>
          <td style="text-align: center;">${proofEl}</td>
          <td style="text-align: center;">${statusBadge}</td>
          <td class="op-note-cell">${tItem.note || '—'}</td>
          <td style="text-align: center;">${actionsHtml}</td>
        </tr>
      `;
    }
  }).join('');

  // 4. Attach Row Action Listeners
  attachRowActionListeners();

  // 5. Render Pagination Navigation
  const displayedEnd = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  renderPagination(startIndex + 1, displayedEnd, totalItems, totalPages);
}

function renderPagination(start, end, total, totalPages) {
  const infoEl = document.getElementById('paginationInfo');
  const controlsEl = document.getElementById('paginationControls');
  if (!infoEl || !controlsEl) return;

  infoEl.textContent = `${t('showing')} ${start} ${t('to')} ${end} ${t('of')} ${total} ${t('records')}`;

  if (totalPages <= 1) {
    controlsEl.innerHTML = '';
    return;
  }

  let pagesHtml = `
    <button type="button" class="btn-page" id="btnPrevPage" ${currentPage === 1 ? 'disabled' : ''} title="${t('prevPage')}">
      ←
    </button>
  `;

  for (let p = 1; p <= totalPages; p++) {
    pagesHtml += `
      <button type="button" class="btn-page ${p === currentPage ? 'active' : ''}" data-goto-page="${p}">
        ${p}
      </button>
    `;
  }

  pagesHtml += `
    <button type="button" class="btn-page" id="btnNextPage" ${currentPage === totalPages ? 'disabled' : ''} title="${t('nextPage')}">
      →
    </button>
  `;

  controlsEl.innerHTML = pagesHtml;

  document.getElementById('btnPrevPage')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderOperations();
    }
  });

  document.getElementById('btnNextPage')?.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderOperations();
    }
  });

  controlsEl.querySelectorAll('[data-goto-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.getAttribute('data-goto-page'));
      renderOperations();
    });
  });
}

function attachRowActionListeners() {
  const isBakers = currentSession.role === 'bakers';

  // Double Click on any table row to open Quick Action Modal
  const tbody = document.getElementById('operationsTableBody');
  if (tbody) {
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('dblclick', (e) => {
        // If clicked on an action button inside the row, ignore row double-click
        if (e.target.closest('button') || e.target.closest('a')) return;

        // Find the view button in this row to extract op ID
        const viewBtn = tr.querySelector('[data-view-id]');
        if (!viewBtn) return;
        const id = viewBtn.getAttribute('data-view-id');
        const op = rawData.transactions.find(t => t.id === id);
        if (!op) return;

        openQuickActionModal(op);
      });
    });
  }

  // View Details Action -> Navigates to operation-details.html?id=...
  document.querySelectorAll('[data-view-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-view-id');
      window.location.href = `operation-details.html?id=${encodeURIComponent(id)}`;
    });
  });

  // Edit Action
  document.querySelectorAll('[data-edit-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-edit-id');
      const op = rawData.transactions.find(t => t.id === id);
      if (!op) return;
      openEditModal(op);
    });
  });

  // Delete Action with Explicit Confirmation
  document.querySelectorAll('[data-void-id]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-void-id');
      await executeDeleteOperation(id);
    });
  });
}

function openQuickActionModal(op) {
  const modal = document.getElementById('quickActionModal');
  const title = document.getElementById('qaModalTitle');
  const subtitle = document.getElementById('qaModalSubtitle');
  const btnView = document.getElementById('qaBtnView');
  const btnEdit = document.getElementById('qaBtnEdit');
  const btnDelete = document.getElementById('qaBtnDelete');
  const btnClose = document.getElementById('btnCloseQaModal');

  if (!modal) return;

  const isVoided = op.status === 'voided';
  const cleanId = (op.id || '').replace(/^tx-(bt|fl)-/, '');
  const refDisplay = op.note ? op.note : `Ref. #${cleanId}`;

  if (title) title.textContent = op.truck ? `Operação: ${op.truck} (${refDisplay})` : `Operação (${refDisplay})`;
  if (subtitle) subtitle.textContent = op.driver ? `Data: ${op.date} - ${op.driver}` : `Data: ${op.date}`;

  // View Details Handler
  btnView.onclick = () => {
    modal.classList.remove('show');
    window.location.href = `operation-details.html?id=${encodeURIComponent(op.id)}`;
  };

  // Edit Handler
  if (btnEdit) {
    if (isVoided) {
      btnEdit.style.display = 'none';
    } else {
      btnEdit.style.display = 'flex';
      btnEdit.onclick = () => {
        modal.classList.remove('show');
        openEditModal(op);
      };
    }
  }

  // Delete Handler
  if (btnDelete) {
    if (isVoided) {
      btnDelete.style.display = 'none';
    } else {
      btnDelete.style.display = 'flex';
      btnDelete.onclick = async () => {
        modal.classList.remove('show');
        await executeDeleteOperation(op.id);
      };
    }
  }

  // Close Handlers
  if (btnClose) btnClose.onclick = () => modal.classList.remove('show');

  modal.classList.add('show');
}

function openEditModal(op) {
  const isBakers = currentSession.role === 'bakers';
  editingTransactionId = op.id;

  document.getElementById('modalTitleText').textContent = t('modalTitleEdit');
  document.getElementById('btnSubmitOp').textContent = t('saveChanges');

  document.getElementById('newOpDate').value = op.date;
  document.getElementById('newOpTruck').value = op.truck || '';
  document.getElementById('newOpDriver').value = op.driver || '';
  document.getElementById('newOpTrailer').value = op.trailer || '';
  document.getElementById('newOpNote').value = op.note || '';

  if (isBakers) {
    if (document.getElementById('newOpOrderAmount')) {
      document.getElementById('newOpOrderAmount').value = op.orderAmount || op.litres || '';
    }
    if (document.getElementById('newOpLoadedAmount')) {
      document.getElementById('newOpLoadedAmount').value = op.loadedAmount || op.litres || '';
    }
    if (document.getElementById('newOpOffloadedAmount')) {
      document.getElementById('newOpOffloadedAmount').value = op.offloadedAmount || op.litres || '';
    }
    if (document.getElementById('newOpRoute') && op.routeId) {
      document.getElementById('newOpRoute').value = op.routeId;
    }
  } else {
    document.getElementById('newOpLitres').value = op.litres;
  }

  document.getElementById('newOperationModal')?.classList.add('show');
}

async function executeDeleteOperation(id) {
  const confirmDelete = confirm(t('deleteConfirm'));
  if (!confirmDelete) return;

  try {
    await api.post(`operations/${encodeURIComponent(id)}/void`, {});
    await loadAndRender();
    alert(t('deleteSuccess'));
  } catch (err) {
    console.error('Error voiding transaction:', err);
    alert(t('deleteError') + (err.message || err));
  }
}

async function handleSaveOperation() {
  const submitBtn = document.getElementById('btnSubmitOp');
  const role = currentSession.role || 'fuellink';
  const isBakers = role === 'bakers';

  const date = document.getElementById('newOpDate').value;
  const truck = document.getElementById('newOpTruck').value.trim();
  const driver = document.getElementById('newOpDriver').value.trim();
  const trailer = document.getElementById('newOpTrailer').value.trim();
  const note = document.getElementById('newOpNote').value.trim();

  const payload = { date, truck, driver, trailer, note };

  if (isBakers) {
    const orderAmount = parseFloat(document.getElementById('newOpOrderAmount').value) || 0;
    const loadedAmount = parseFloat(document.getElementById('newOpLoadedAmount').value) || 0;
    const offloadedAmount = parseFloat(document.getElementById('newOpOffloadedAmount').value) || 0;

    if (!date || loadedAmount <= 0 || offloadedAmount <= 0 || !truck || !driver) {
      alert(t('fillRequired'));
      return;
    }

    payload.litres = offloadedAmount || loadedAmount || 0;
    payload.order_amount = orderAmount;
    payload.loaded_amount = loadedAmount;
    payload.offloaded_amount = offloadedAmount;
    payload.route_id = document.getElementById('newOpRoute').value;
  } else {
    const litres = parseFloat(document.getElementById('newOpLitres').value) || 0;
    if (!date || litres <= 0 || !truck || !driver) {
      alert(t('fillRequired'));
      return;
    }
    payload.litres = litres;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = t('saving');

  try {
    // amount/unit_rate/detail (and, for Bankers, loaded_offloaded_diff/
    // delivery_value) are computed server-side — see
    // OperationController::computeFinancials(). Never sent from here.
    const savedOp = editingTransactionId
      ? await api.patch(`operations/${encodeURIComponent(editingTransactionId)}`, payload)
      : await api.post('operations', payload);

    if (isBakers) {
      await uploadBankersProofs(savedOp.id);
    } else {
      await uploadFuellinkDeliveryNote(savedOp.id);
    }

    document.getElementById('newOperationModal')?.classList.remove('show');
    document.getElementById('newOperationForm')?.reset();
    await loadAndRender();

  } catch (err) {
    console.error('Error saving operation:', err);
    alert('Erro ao processar: ' + (err.message || err));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isBakers ? t('save') : 'Gravar Registo';
  }
}

/**
 * Uploads whichever Bankers proof files were selected, one multipart POST
 * per field, against POST /api/operations/{id}/proof/{field} —
 * OperationController::attachProof() (server validates extension, real
 * content-sniffed MIME, and a 5MB size cap). A field with no file selected
 * is skipped, not sent as an empty upload.
 */
async function uploadBankersProofs(operationId) {
  const fields = [
    ['order', 'newOpOrderProof'],
    ['loaded', 'newOpLoadedProof'],
    ['offloaded', 'newOpOffloadedProof']
  ];

  for (const [field, inputId] of fields) {
    const file = document.getElementById(inputId)?.files?.[0];
    if (!file) continue;

    const formData = new FormData();
    formData.append('proof', file);

    try {
      await api.upload(`operations/${encodeURIComponent(operationId)}/proof/${field}`, formData);
    } catch (err) {
      console.error(`Error uploading ${field} proof:`, err);
      alert(`Erro ao enviar comprovativo (${field}): ` + (err.message || err));
    }
  }
}

/**
 * Uploads the FuelLink delivery note/proof, against POST
 * /api/operations/{id}/proof/delivery_note — OperationController::
 * attachProof() (same validation as the Bankers proofs: extension,
 * content-sniffed MIME, 5MB cap). No-op if no file was selected.
 */
async function uploadFuellinkDeliveryNote(operationId) {
  const file = document.getElementById('newOpProof')?.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('proof', file);

  try {
    await api.upload(`operations/${encodeURIComponent(operationId)}/proof/delivery_note`, formData);
  } catch (err) {
    console.error('Error uploading delivery note:', err);
    alert('Erro ao enviar comprovativo: ' + (err.message || err));
  }
}

function handleExportData(format) {
  const operations = getFilteredOperations();
  const role = currentSession.role || 'fuellink';
  const isBakers = role === 'bakers';
  const roleName = isBakers ? 'Bankers Tankers' : 'FuelLink';
  const dateStr = new Date().toISOString().split('T')[0];

  if (format === 'excel') {
    // Generate CSV for Excel
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += isBakers
      ? 'Data;Camiao;Motorista;Trailer;Rota;Ordem (L);Carregado (L);Descarregado (L);Diferenca (L);Valor a Entregar (R);Estado;Nota\r\n'
      : 'Data;Camiao;Motorista;Trailer;Litros Vendidos;Valor (R);Comprovativo;Estado;Nota\r\n';

    operations.forEach(t => {
      const diffVal = (t.loadedAmount || 0) - (t.offloadedAmount || 0);
      const row = isBakers ? [
        t.date,
        t.truck,
        t.driver,
        t.trailer || '',
        t.routeId || '',
        t.orderAmount || t.litres || 0,
        t.loadedAmount || t.litres || 0,
        t.offloadedAmount || t.litres || 0,
        diffVal,
        t.amount,
        t.status,
        (t.note || '').replace(/;/g, ',')
      ] : [
        t.date,
        t.truck,
        t.driver,
        t.trailer || '',
        t.litres,
        t.amount,
        t.deliveryNotePath ? 'Sim' : 'Nao',
        t.status,
        (t.note || '').replace(/;/g, ',')
      ];
      csvContent += row.join(';') + '\r\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Operacoes_${roleName}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } else if (format === 'pdf') {
    // Trigger Print layout formatted as clean PDF report
    const printWin = window.open('', '_blank');
    const tableRows = operations.map(t => `
      <tr>
        <td>${t.date}</td>
        <td>${t.truck}</td>
        <td>${t.driver}</td>
        <td style="text-align:right;">${(t.litres || 0).toLocaleString('pt-PT')} L</td>
        <td style="text-align:right;">R ${(t.amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        <td style="text-align:center;">${t.status === 'active' ? 'Ativo' : 'Anulado'}</td>
      </tr>
    `).join('');

    printWin.document.write(`
      <html>
      <head>
        <title>Relatório Operacional - ${roleName}</title>
        <style>
          body { font-family: sans-serif; padding: 24px; color: #0F172A; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          p { font-size: 12px; color: #64748B; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #E2E8F0; padding: 8px 10px; text-align: left; }
          th { background: #F8FAFC; text-transform: uppercase; font-size: 10px; color: #64748B; }
        </style>
      </head>
      <body>
        <h1>${roleName} | Relatório de Operações</h1>
        <p>Exportado em: ${new Date().toLocaleString('pt-PT')} | Total de registos: ${operations.length}</p>
        <table>
          <thead>
            <tr><th>Data</th><th>Camião</th><th>Motorista</th><th style="text-align:right;">Litros</th><th style="text-align:right;">Valor</th><th style="text-align:center;">Estado</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);

  } else if (format === 'word') {
    // Generate .doc HTML table blob
    const htmlDoc = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>Relatório ${roleName}</title></head>
      <body>
        <h2>${roleName} | Relatório Operacional</h2>
        <p>Data de exportação: ${dateStr}</p>
        <table border="1" style="border-collapse:collapse; width:100%;">
          <tr style="background-color:#f2f2f2;"><th>Data</th><th>Camião</th><th>Motorista</th><th>Litros</th><th>Valor</th><th>Estado</th></tr>
          ${operations.map(t => `<tr><td>${t.date}</td><td>${t.truck}</td><td>${t.driver}</td><td>${t.litres}</td><td>R ${t.amount.toFixed(2)}</td><td>${t.status}</td></tr>`).join('')}
        </table>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff', htmlDoc], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_${roleName}_${dateStr}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
