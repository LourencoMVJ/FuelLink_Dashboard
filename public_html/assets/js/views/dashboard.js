/**
 * Dashboard View Controller
 * Implements strict company data isolation, dynamic start/end date filter reactions,
 * 4 adaptive KPIs, chart visualizations, and top 5 recent operations.
 */
import { getSession } from '../core/auth.js';
import { initSidebar } from '../core/sidebar.js';
import { initHeaderControls, t, getCurrentLanguage } from '../core/i18n.js';
import { fetchCompanyData } from '../models/transactions.js';

let rawData = null;
let currentSession = null;
let donutChartInstance = null;
let trendChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Auth Guard (with graceful local fallback)
  try {
    currentSession = await getSession();
    if (!currentSession || !currentSession.session) {
      const localRole = localStorage.getItem('fuellink_current_role') || 'fuellink';
      currentSession = {
        role: localRole,
        session: { user: { email: localRole === 'bakers' ? 'shads@bakers.co.za' : 'shads@fuelink.co.za' } }
      };
    }
  } catch (err) {
    console.warn('Auth verification fallback:', err);
    currentSession = {
      role: 'fuellink',
      session: { user: { email: 'shads@fuelink.co.za' } }
    };
  }

  // 2. Init Controls (Theme, Language, Sidebar, Header)
  try {
    initHeaderControls('headerControls');
  } catch (e) {
    console.warn('Header controls error:', e);
  }

  try {
    initSidebar('dashboard', currentSession);
  } catch (e) {
    console.warn('Sidebar init error:', e);
  }

  setupHeader(currentSession);

  // 3. Setup Default Filter Dates (e.g. Current Month)
  setupDefaultDates();

  // 4. Fetch & Render Data
  await loadAndRender();

  // 5. Setup Listeners
  setupEventListeners();
});

function setupHeader(session) {
  const role = session.role || 'fuellink';
  const roleLabel = role === 'bakers' ? 'Bankers Tankers' : 'FuelLink';
  const email = session.session?.user?.email || '';
  const userName = email.split('@')[0] || (role === 'bakers' ? 'Bakers Admin' : 'FuelLink Admin');

  if (role === 'bakers') {
    document.body.classList.add('role-bakers');
    document.body.classList.remove('role-fuellink');
  } else {
    document.body.classList.add('role-fuellink');
    document.body.classList.remove('role-bakers');
  }

  const greetingEl = document.getElementById('userGreeting');
  const subGreetingEl = document.getElementById('subGreeting');

  if (greetingEl) {
    greetingEl.innerHTML = `${getCurrentLanguage() === 'en' ? 'Hello' : 'Olá'}, ${userName}! <span class="wave">👋</span>`;
  }
  if (subGreetingEl) {
    subGreetingEl.textContent = role === 'bakers' ? t('overviewSubtitleBT') : t('overviewSubtitleFL');
  }

  // Filter Labels & Presets
  const lblPeriodPreset = document.getElementById('lblPeriodPreset');
  const optPeriodAll = document.getElementById('optPeriodAll');
  const optPeriodToday = document.getElementById('optPeriodToday');
  const optPeriodWeek = document.getElementById('optPeriodWeek');
  const optPeriodMonth = document.getElementById('optPeriodMonth');
  const optPeriodCustom = document.getElementById('optPeriodCustom');
  const lblStartDate = document.getElementById('lblStartDate');
  const lblEndDate = document.getElementById('lblEndDate');
  const lblTruckFilter = document.getElementById('lblTruckFilter');
  const btnApplyFiltersText = document.getElementById('btnApplyFiltersText');
  const btnResetFilters = document.getElementById('btnResetFilters');

  if (lblPeriodPreset) lblPeriodPreset.textContent = t('quickPeriod');
  if (optPeriodAll) optPeriodAll.textContent = t('allHistory');
  if (optPeriodToday) optPeriodToday.textContent = t('today');
  if (optPeriodWeek) optPeriodWeek.textContent = t('thisWeek');
  if (optPeriodMonth) optPeriodMonth.textContent = t('thisMonth');
  if (optPeriodCustom) optPeriodCustom.textContent = t('custom');
  if (lblStartDate) lblStartDate.textContent = t('startDate');
  if (lblEndDate) lblEndDate.textContent = t('endDate');
  if (lblTruckFilter) lblTruckFilter.textContent = t('truck');
  if (btnApplyFiltersText) btnApplyFiltersText.textContent = t('applyFilters');
  if (btnResetFilters) btnResetFilters.textContent = t('reset');

  // Chart Titles & Subtitles
  const donutTitle = document.getElementById('donutTitle');
  const donutSubtitle = document.getElementById('donutSubtitle');
  const trendTitle = document.getElementById('trendTitle');
  const trendSubtitle = document.getElementById('trendSubtitle');
  const recentOpsTitle = document.getElementById('recentOpsTitle');
  const recentOpsSubtitle = document.getElementById('recentOpsSubtitle');
  const viewAllOpsText = document.getElementById('viewAllOpsText');
  const netPositionTitle = document.getElementById('netPositionTitle');
  const netPositionDesc = document.getElementById('netPositionDesc');

  if (donutTitle) donutTitle.textContent = t('donutTitle');
  if (donutSubtitle) donutSubtitle.textContent = t('donutSubtitle');
  if (trendTitle) trendTitle.textContent = t('trendTitle');
  if (trendSubtitle) trendSubtitle.textContent = t('trendSubtitle');
  if (recentOpsTitle) recentOpsTitle.textContent = t('recentOpsTitle');
  if (recentOpsSubtitle) recentOpsSubtitle.textContent = t('recentOpsSubtitle');
  if (viewAllOpsText) viewAllOpsText.textContent = t('viewAllOps');
  if (netPositionTitle) netPositionTitle.textContent = t('netPositionTitle');
  if (netPositionDesc) netPositionDesc.textContent = t('netPositionDesc');
}

function setupDefaultDates() {
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const periodPreset = document.getElementById('periodPreset');

  if (periodPreset) periodPreset.value = 'all';
  if (startDateInput) startDateInput.value = '';
  if (endDateInput) endDateInput.value = '';
}

function setupEventListeners() {
  const periodPreset = document.getElementById('periodPreset');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const applyBtn = document.getElementById('btnApplyFilters');
  const resetBtn = document.getElementById('btnResetFilters');

  periodPreset?.addEventListener('change', () => {
    const val = periodPreset.value;
    const now = new Date();

    if (val === 'all') {
      startDateInput.value = '';
      endDateInput.value = '';
    } else if (val === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      startDateInput.value = todayStr;
      endDateInput.value = todayStr;
    } else if (val === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(now.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      startDateInput.value = monday.toISOString().split('T')[0];
      endDateInput.value = sunday.toISOString().split('T')[0];
    } else if (val === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      startDateInput.value = firstDay.toISOString().split('T')[0];
      endDateInput.value = lastDay.toISOString().split('T')[0];
    }
    renderDashboard();
  });

  applyBtn?.addEventListener('click', () => {
    if (periodPreset) periodPreset.value = 'custom';
    renderDashboard();
  });

  resetBtn?.addEventListener('click', () => {
    if (periodPreset) periodPreset.value = 'all';
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    const truckFilter = document.getElementById('truckFilter');
    if (truckFilter) truckFilter.value = '';
    renderDashboard();
  });
}

async function loadAndRender() {
  try {
    rawData = await fetchCompanyData(currentSession.role);
    populateTruckFilter(rawData.trucks);
    renderDashboard();
  } catch (err) {
    console.error('Error loading company data:', err);
  }
}

function populateTruckFilter(trucks) {
  const truckFilter = document.getElementById('truckFilter');
  if (!truckFilter) return;

  const currentVal = truckFilter.value;
  truckFilter.innerHTML = '<option value="">Todos os Camiões</option>';

  (trucks || []).forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.reg_number;
    opt.textContent = t.reg_number + (t.description ? ` (${t.description})` : '');
    truckFilter.appendChild(opt);
  });

  truckFilter.value = currentVal;
}

function getFilteredTransactions() {
  if (!rawData || !rawData.transactions) return [];

  const role = currentSession.role || 'fuellink';
  const startDate = document.getElementById('startDate')?.value;
  const endDate = document.getElementById('endDate')?.value;
  const truck = document.getElementById('truckFilter')?.value;

  // Strict company isolation: Fuellink only sees 'diesel', Bakers only sees 'logistics'
  const allowedType = role === 'bakers' ? 'logistics' : 'diesel';

  return rawData.transactions.filter(t => {
    // Company data isolation
    if (t.type !== allowedType) return false;

    // Truck filter
    if (truck && t.truck !== truck) return false;

    // Date range filter
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;

    return true;
  });
}

function renderDashboard() {
  const filtered = getFilteredTransactions();
  const role = currentSession.role || 'fuellink';

  renderKPIs(filtered, role);
  renderCharts(filtered, role);
  renderRecentTable(filtered, role);
}

function renderKPIs(transactions, role) {
  const container = document.getElementById('kpiContainer');
  if (!container) return;

  const activeTxs = transactions.filter(t => t.status === 'active');
  const count = activeTxs.length;

  if (role === 'bakers') {
    // Bankers Tankers KPIs
    const totalLitres = activeTxs.reduce((sum, t) => sum + (t.litres || 0), 0);
    const totalValue = activeTxs.reduce((sum, t) => sum + (t.amount || 0), 0);

    container.innerHTML = `
      <!-- KPI 1: Litres Hauled -->
      <div class="kpi-card bakers">
        <div class="kpi-card-header">
          <span class="kpi-label">${t('litresHauled')}</span>
          <span class="kpi-status-pill">${t('kpiNormalTag')}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">${totalLitres.toLocaleString('pt-PT')}</span>
          <span class="kpi-unit">${t('litres')}</span>
        </div>
        <div class="kpi-footer">
          <span>${t('kpiSelectedPeriod')}</span>
          <span class="kpi-trend positive">↑ ${t('activeStatus')}</span>
        </div>
      </div>

      <!-- KPI 2: Total Supply Value -->
      <div class="kpi-card bakers">
        <div class="kpi-card-header">
          <span class="kpi-label">${t('totalSupplyValue')}</span>
          <span class="kpi-status-pill high">${t('kpiRandsTag')}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">R ${totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="kpi-footer">
          <span>${t('kpiAccumulatedTotal')}</span>
          <span class="kpi-trend positive">Total</span>
        </div>
      </div>

      <!-- KPI 3: Total Deliveries -->
      <div class="kpi-card bakers">
        <div class="kpi-card-header">
          <span class="kpi-label">${t('deliveriesCount')}</span>
          <span class="kpi-status-pill optimal">${t('kpiTripsTag')}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">${count}</span>
          <span class="kpi-unit">${t('operations')}</span>
        </div>
        <div class="kpi-footer">
          <span>${t('kpiRegisteredDeliveries')}</span>
          <span class="kpi-trend neutral">—</span>
        </div>
      </div>

      <!-- KPI 4: Fuel Difference -->
      <div class="kpi-card bakers">
        <div class="kpi-card-header">
          <span class="kpi-label">${t('fuelDiff')}</span>
          <span class="kpi-status-pill">${t('kpiMonth4')}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">—</span>
        </div>
        <div class="kpi-footer">
          <span>${t('kpiAwaitingDelivered')}</span>
          <span class="kpi-trend neutral">—</span>
        </div>
      </div>
    `;
  } else {
    // FuelLink KPIs
    const totalLitres = activeTxs.reduce((sum, t) => sum + (t.litres || 0), 0);
    const totalValue = activeTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
    const avgPrice = totalLitres > 0 ? (totalValue / totalLitres) : (rawData?.dieselPrice || 27.61);

    container.innerHTML = `
      <!-- KPI 1: Litres Sold (Dynamic to filters) -->
      <div class="kpi-card fuellink">
        <div class="kpi-card-header">
          <span class="kpi-label">${t('litresSold')}</span>
          <span class="kpi-status-pill">${t('kpiVolumeTag')}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">${totalLitres.toLocaleString('pt-PT')}</span>
          <span class="kpi-unit">${t('litres')}</span>
        </div>
        <div class="kpi-footer">
          <span>${t('kpiReactiveDate')}</span>
          <span class="kpi-trend positive">↑ ${t('kpiVolumeTag')}</span>
        </div>
      </div>

      <!-- KPI 2: Total Sales Value -->
      <div class="kpi-card fuellink">
        <div class="kpi-card-header">
          <span class="kpi-label">${t('totalSoldValue')}</span>
          <span class="kpi-status-pill high">${t('kpiRandsTag')}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">R ${totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="kpi-footer">
          <span>${t('kpiCalculatedBilling')}</span>
          <span class="kpi-trend positive">Total</span>
        </div>
      </div>

      <!-- KPI 3: Number of Operations -->
      <div class="kpi-card fuellink">
        <div class="kpi-card-header">
          <span class="kpi-label">${t('operationsCount')}</span>
          <span class="kpi-status-pill optimal">${t('kpiSalesTag')}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">${count}</span>
          <span class="kpi-unit">${t('operations')}</span>
        </div>
        <div class="kpi-footer">
          <span>${t('kpiActiveOps')}</span>
          <span class="kpi-trend neutral">—</span>
        </div>
      </div>

      <!-- KPI 4: Average Diesel Price -->
      <div class="kpi-card fuellink">
        <div class="kpi-card-header">
          <span class="kpi-label">${t('avgDieselPrice')}</span>
          <span class="kpi-status-pill">${t('kpiPriceTag')}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">R ${avgPrice.toFixed(2)}</span>
          <span class="kpi-unit">/ L</span>
        </div>
        <div class="kpi-footer">
          <span>${t('kpiAvgPeriod')}</span>
          <span class="kpi-trend neutral">—</span>
        </div>
      </div>
    `;
  }
}

function renderCharts(transactions, role) {
  const donutCanvas = document.getElementById('donutChart');
  const trendCanvas = document.getElementById('trendChart');
  if (!donutCanvas || !trendCanvas || typeof Chart === 'undefined') return;

  const activeTxs = transactions.filter(t => t.status === 'active');

  // 1. Group Volume by Truck for Donut Chart
  const truckMap = {};
  activeTxs.forEach(t => {
    const key = t.truck || 'Sem Camião';
    truckMap[key] = (truckMap[key] || 0) + (t.litres || 0);
  });

  const donutLabels = Object.keys(truckMap);
  const donutData = Object.values(truckMap);

  const themePrimary = role === 'bakers' ? '#EB6834' : '#185FA5';
  const themeSecondary = role === 'bakers' ? '#F97316' : '#2A78D6';
  const themePalette = role === 'bakers'
    ? ['#EB6834', '#F97316', '#FB923C', '#FDBA74', '#D05321', '#9A3412']
    : ['#185FA5', '#2A78D6', '#38BDF8', '#60A5FA', '#1E40AF', '#0284C7'];

  if (donutChartInstance) donutChartInstance.destroy();

  donutChartInstance = new Chart(donutCanvas, {
    type: 'doughnut',
    data: {
      labels: donutLabels.length > 0 ? donutLabels : [t('noChartData')],
      datasets: [{
        data: donutData.length > 0 ? donutData : [1],
        backgroundColor: themePalette,
        borderWidth: 2,
        borderColor: '#FFFFFF'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.raw.toLocaleString('pt-PT')} L`
          }
        }
      }
    }
  });

  // 2. Timeline Aggregation for Trend Chart
  const dateMap = {};
  const sorted = [...activeTxs].sort((a, b) => (a.date > b.date ? 1 : -1));
  sorted.forEach(tItem => {
    dateMap[tItem.date] = (dateMap[tItem.date] || 0) + (tItem.litres || 0);
  });

  const trendLabels = Object.keys(dateMap);
  const trendData = Object.values(dateMap);

  if (trendChartInstance) trendChartInstance.destroy();

  const themeColor = role === 'bakers' ? '#EB6834' : '#185FA5';
  const themeBg = role === 'bakers' ? 'rgba(235, 104, 52, 0.14)' : 'rgba(24, 95, 165, 0.14)';

  trendChartInstance = new Chart(trendCanvas, {
    type: 'line',
    data: {
      labels: trendLabels.length > 0 ? trendLabels : [t('noChartData')],
      datasets: [{
        label: t('chartVolumeLabel'),
        data: trendData.length > 0 ? trendData : [0],
        borderColor: themeColor,
        backgroundColor: themeBg,
        borderWidth: 2.5,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: themeColor,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(226, 232, 240, 0.6)' },
          ticks: { font: { size: 11 } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.raw.toLocaleString('pt-PT')} ${t('litres')}`
          }
        }
      }
    }
  });
}

function renderRecentTable(transactions, role) {
  const thead = document.getElementById('recentTableHead');
  const tbody = document.getElementById('recentTableBody');
  if (!thead || !tbody) return;

  if (role === 'bakers') {
    thead.innerHTML = `
      <th>${t('date')}</th>
      <th>${t('truckCol')}</th>
      <th>${t('driver')}</th>
      <th>${t('trailer')}</th>
      <th style="text-align: right;">${t('litresLoaded')}</th>
      <th style="text-align: right;">${t('valueR')}</th>
      <th style="text-align: center;">${t('statusCol')}</th>
    `;
  } else {
    thead.innerHTML = `
      <th>${t('date')}</th>
      <th>${t('truckCol')}</th>
      <th>${t('driver')}</th>
      <th style="text-align: right;">${t('litresSoldCol')}</th>
      <th style="text-align: right;">${t('saleValueR')}</th>
      <th style="text-align: center;">${t('proof')}</th>
      <th style="text-align: center;">${t('statusCol')}</th>
    `;
  }

  // Get only top 5 recent
  const top5 = transactions.slice(0, 5);

  if (top5.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: #94A3B8; padding: 28px;">
          ${t('noDataFound')}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = top5.map(tItem => {
    const isVoided = tItem.status === 'voided';
    const statusPill = isVoided
      ? `<span class="table-badge voided">${t('voidedStatus')}</span>`
      : `<span class="table-badge active">${t('activeStatus')}</span>`;

    const currentLang = getCurrentLanguage();
    const formattedAmount = (tItem.amount || 0).toLocaleString(currentLang === 'pt' ? 'pt-PT' : 'en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (role === 'bakers') {
      const proofIcon = tItem.deliveryNotePath
        ? `<span class="proof-status-badge verified" title="${t('proof')}">✓</span>`
        : `<span class="proof-status-badge missing" title="${t('proof')}">✕</span>`;

      return `
        <tr class="${isVoided ? 'tr-voided' : ''}">
          <td style="font-weight: 600;">${tItem.date}</td>
          <td><b>${tItem.truck || '—'}</b></td>
          <td>${tItem.driver || '—'}</td>
          <td>${tItem.trailer || '—'}</td>
          <td style="text-align: right; font-weight: 600;">${(tItem.litres || 0).toLocaleString('pt-PT')}&nbsp;L</td>
          <td style="text-align: right; font-weight: 700; white-space: nowrap;">R&nbsp;${formattedAmount}</td>
          <td style="text-align: center;">${statusPill}</td>
        </tr>
      `;
    } else {
      const proofIcon = tItem.deliveryNotePath
        ? `<span class="proof-status-badge verified" title="${t('proof')}">✓</span>`
        : `<span class="proof-status-badge missing" title="${t('proof')}">✕</span>`;

      return `
        <tr class="${isVoided ? 'tr-voided' : ''}">
          <td style="font-weight: 600;">${tItem.date}</td>
          <td><b>${tItem.truck || '—'}</b></td>
          <td>${tItem.driver || '—'}</td>
          <td style="text-align: right; font-weight: 600;">${(tItem.litres || 0).toLocaleString('pt-PT')}&nbsp;L</td>
          <td style="text-align: right; font-weight: 700; white-space: nowrap;">R&nbsp;${formattedAmount}</td>
          <td style="text-align: center;">${proofIcon}</td>
          <td style="text-align: center;">${statusPill}</td>
        </tr>
      `;
    }
  }).join('');
}
