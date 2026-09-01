/**
 * Dashboard View Controller
 * Implements strict company data isolation, dynamic start/end date filter reactions,
 * 4 adaptive KPIs, chart visualizations, and top 5 recent operations.
 */
import { getSession } from '../core/auth.js';
import { initSidebar } from '../core/sidebar.js';
import { initHeaderControls, t, getCurrentLanguage } from '../core/i18n.js';
import { fetchCompanyData } from '../models/transactions.js';
import { api } from '../core/api.js';

let rawData = null;
let currentSession = null;
let donutChartInstance = null;
let trendChartInstance = null;
let ledgerData = null;

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

  // 4. Fetch & Render Data — ledger and company data are independent reads,
  // run together. renderDashboard() (inside loadAndRender()) reads
  // ledgerData for KPI card 3/charts, so both must settle before it runs,
  // but neither fetch depends on the other's result.
  await Promise.all([loadLedgerIfAdmin(), loadAndRender()]);
  renderNetPositionBanner();

  // 5. Setup Listeners
  setupEventListeners();
});

/**
 * Cross-company data (GET /api/ledger) — admin-only (LedgerController::
 * index() 403s for anyone else), fetched once per page load and shared by
 * the Net Position banner and the FuelLink "Logistics fees" KPI card below.
 * Stays null for every non-admin session, including every local mock
 * account.
 */
async function loadLedgerIfAdmin() {
  if (!currentSession?.isAdmin) {
    ledgerData = null;
    return;
  }

  try {
    ledgerData = await api.get('ledger');
  } catch (err) {
    console.warn('Ledger data unavailable:', err);
    ledgerData = null;
  }
}

/**
 * Net Position banner — not reactive to the period filter: the endpoint
 * itself takes no date range, it's a running balance across every
 * transaction ever recorded.
 */
function renderNetPositionBanner() {
  const section = document.getElementById('netPositionSection');
  if (!section) return;

  if (!ledgerData) {
    section.style.display = 'none';
    return;
  }

  const valueEl = document.getElementById('netPositionValue');
  const descEl = document.getElementById('netPositionDesc');

  if (valueEl) {
    valueEl.textContent = `R ${Math.abs(ledgerData.net_balance).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    valueEl.classList.remove('fuellink', 'bakers');
    valueEl.classList.add(currentSession.role === 'bakers' ? 'bakers' : 'fuellink');
  }
  if (descEl) descEl.textContent = netPositionMessage(ledgerData.net_balance);

  section.style.display = 'flex';
}

function netPositionMessage(netBalance) {
  if (netBalance > 0.005) return t('netPositionOwedToFuelLink');
  if (netBalance < -0.005) return t('netPositionOwedToBakers');
  return t('netPositionSettled');
}

/**
 * Total Bakers logistics fees, net of voids — same accumulation as the old
 * dashboard's renderStatsAndChart() (logisticsTotal/logisticsLitres):
 * 'logistics' rows add, their 'void' reversal rows (voids_type ===
 * 'logistics') subtract back out.
 * @param {{bakers: Array<object>}} ledger
 */
function computeLogisticsFees(ledger) {
  let total = 0;
  let litres = 0;

  (ledger.bakers || []).forEach(tx => {
    if (tx.type === 'logistics') {
      total += Number(tx.amount || 0);
      litres += Number(tx.litres || 0);
    } else if (tx.type === 'void' && tx.voids_type === 'logistics') {
      total -= Number(tx.amount || 0);
      litres -= Number(tx.litres || 0);
    }
  });

  return { total, litres };
}

function setupHeader(session) {
  const role = session.role || 'fuellink';
  const roleLabel = role === 'bakers' ? 'Bankers Tankers' : 'FuelLink';
  const email = session.session?.user?.email || '';
  const userName = email.split('@')[0] || (role === 'bakers' ? 'Bakers Admin' : 'FuelLink Admin');

  document.documentElement.setAttribute('data-company', role);
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
    loadAndRender();
  });

  applyBtn?.addEventListener('click', () => {
    if (periodPreset) periodPreset.value = 'custom';
    loadAndRender();
  });

  resetBtn?.addEventListener('click', () => {
    if (periodPreset) periodPreset.value = 'all';
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    const truckFilter = document.getElementById('truckFilter');
    if (truckFilter) truckFilter.value = '';
    loadAndRender();
  });
}

async function loadAndRender() {
  try {
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    rawData = await fetchCompanyData(currentSession.role, { startDate, endDate });
    populateTruckFilter(rawData.trucks);
    await renderDashboard();
  } catch (err) {
    console.error('Error loading company data:', err);
  }
}

function populateTruckFilter(trucks) {
  const truckFilter = document.getElementById('truckFilter');
  if (!truckFilter) return;

  const currentVal = truckFilter.value;
  truckFilter.innerHTML = `<option value="">${t('allTrucks')}</option>`;

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

async function renderDashboard() {
  const filtered = getFilteredTransactions();
  const role = currentSession.role || 'fuellink';

  await renderKPIs(role);
  renderCharts(filtered, role);
  renderRecentTable(filtered, role);
}

/**
 * Server-calculated KPIs (GET /api/operations/summary) — reacts to the
 * period filter only, same as documented in docs/API_CONTRACT.md Section 7
 * (the truck filter stays client-side for the charts/table below, not part
 * of the summary contract). Falls back to a local reduce() over the
 * truck+date filtered dataset when the API call fails — e.g. a local mock
 * session with no real Supabase JWT to authenticate the request with.
 */
async function renderKPIs(role) {
  const container = document.getElementById('kpiContainer');
  if (!container) return;

  let data;
  try {
    data = await fetchKpiSummary(role);
  } catch (err) {
    console.warn('KPI summary API unavailable, using local calculation:', err);
    data = computeLocalKpiData(role);
  }

  renderKpiCards(container, data, role);
}

async function fetchKpiSummary(role) {
  const startDate = document.getElementById('startDate')?.value;
  const endDate = document.getElementById('endDate')?.value;

  const params = new URLSearchParams();
  if (startDate) params.set('from', startDate);
  if (endDate) params.set('to', endDate);

  const qs = params.toString();
  const summary = await api.get(`operations/summary${qs ? '?' + qs : ''}`);

  if (role === 'bakers') {
    return {
      volume: summary.litres_transported,
      value: summary.total_supply_value,
      count: summary.deliveries_count
    };
  }

  return {
    volume: summary.litres_sold,
    value: summary.total_sold,
    count: summary.operations_count,
    avgPrice: summary.avg_diesel_price
  };
}

function computeLocalKpiData(role) {
  const filtered = getFilteredTransactions();
  const activeTxs = filtered.filter(t => t.status === 'active');
  const count = activeTxs.length;
  const totalLitres = activeTxs.reduce((sum, t) => sum + (t.litres || 0), 0);
  const totalValue = activeTxs.reduce((sum, t) => sum + (t.amount || 0), 0);

  if (role === 'bakers') {
    return { volume: totalLitres, value: totalValue, count };
  }

  const avgPrice = totalLitres > 0 ? (totalValue / totalLitres) : (rawData?.dieselPrice || 27.61);
  return { volume: totalLitres, value: totalValue, count, avgPrice };
}

function renderKpiCards(container, data, role) {
  const count = data.count || 0;

  if (role === 'bakers') {
    const totalLitres = data.volume || 0;
    const totalValue = data.value || 0;

    container.innerHTML = `
      <!-- KPI 1: Litres Hauled -->
      <div class="kpi-card bakers">
        <div class="kpi-card-header">
          <span class="kpi-label">${t('litresHauled')}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">${totalLitres.toLocaleString('pt-PT')}</span>
          <span class="kpi-unit">${t('litres')}</span>
        </div>
        <div class="kpi-footer">
          <span>${t('kpiSelectedPeriod')}</span>
        </div>
      </div>

      <!-- KPI 2: Total Supply Value -->
      <div class="kpi-card bakers">
        <div class="kpi-card-header">
          <span class="kpi-label">${t('totalSupplyValue')}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">R ${totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="kpi-footer">
          <span>${t('kpiAccumulatedTotal')}</span>
        </div>
      </div>

      <!-- KPI 3: Total Deliveries -->
      <div class="kpi-card bakers">
        <div class="kpi-card-header">
          <span class="kpi-label">${t('deliveriesCount')}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">${count}</span>
          <span class="kpi-unit">${t('operations')}</span>
        </div>
        <div class="kpi-footer">
          <span>${t('kpiRegisteredDeliveries')}</span>
        </div>
      </div>

      <!-- KPI 4: Fuel Difference -->
      <div class="kpi-card bakers">
        <div class="kpi-card-header">
          <span class="kpi-label">${t('fuelDiff')}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">—</span>
        </div>
        <div class="kpi-footer">
          <span>${t('kpiAwaitingDelivered')}</span>
        </div>
      </div>
    `;
  } else {
    // FuelLink KPIs
    const totalLitres = data.volume || 0;
    const totalValue = data.value || 0;
    const avgPrice = data.avgPrice || 0;

    // KPI 3 shows the old dashboard's cross-company "Logistics fees (Bakers
    // owed)" figure when the cross-company ledger is available (admins
    // only, see loadLedgerIfAdmin()); a non-admin FuelLink session has no
    // access to Bakers' data at all, so it keeps the operations-count card
    // instead.
    const kpi3Html = ledgerData
      ? (() => {
          const fees = computeLogisticsFees(ledgerData);
          return `
      <div class="kpi-card fuellink">
        <div class="kpi-card-header">
          <span class="kpi-label">${t('logisticsFeesLabel')}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">R ${fees.total.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="kpi-footer">
          <span>${fees.litres.toLocaleString('pt-PT')} ${t('litres')} ${t('kpiHauled')}</span>
        </div>
      </div>`;
        })()
      : `
      <div class="kpi-card fuellink">
        <div class="kpi-card-header">
          <span class="kpi-label">${t('operationsCount')}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">${count}</span>
          <span class="kpi-unit">${t('operations')}</span>
        </div>
        <div class="kpi-footer">
          <span>${t('kpiActiveOps')}</span>
        </div>
      </div>`;

    container.innerHTML = `
      <!-- KPI 1: Litres Sold (Dynamic to filters) -->
      <div class="kpi-card fuellink">
        <div class="kpi-card-header">
          <span class="kpi-label">${t('litresSold')}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">${totalLitres.toLocaleString('pt-PT')}</span>
          <span class="kpi-unit">${t('litres')}</span>
        </div>
        <div class="kpi-footer">
          <span>${t('kpiReactiveDate')}</span>
        </div>
      </div>

      <!-- KPI 2: Total Sales Value -->
      <div class="kpi-card fuellink">
        <div class="kpi-card-header">
          <span class="kpi-label">${t('totalSoldValue')}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">R ${totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="kpi-footer">
          <span>${t('kpiCalculatedBilling')}</span>
        </div>
      </div>

      <!-- KPI 3: Operations Count, or Logistics Fees (Bakers owed) for admins -->
      ${kpi3Html}

      <!-- KPI 4: Average Diesel Price -->
      <div class="kpi-card fuellink">
        <div class="kpi-card-header">
          <span class="kpi-label">${t('avgDieselPrice')}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">R ${avgPrice.toFixed(2)}</span>
          <span class="kpi-unit">/ L</span>
        </div>
        <div class="kpi-footer">
          <span>${t('kpiAvgPeriod')}</span>
        </div>
      </div>
    `;
  }
}

const MONTH_LABELS = {
  pt: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
};

function renderCharts(transactions, role) {
  const monthlyCanvas = document.getElementById('donutChart');
  const trendCanvas = document.getElementById('trendChart');
  if (!monthlyCanvas || !trendCanvas || typeof Chart === 'undefined') return;

  const activeTxs = transactions.filter(t => t.status === 'active');

  // 1. Group Volume by Calendar Month (Jan-Dec) for the Monthly Volume bar
  // chart — parsed from the YYYY-MM-DD string directly (not via `new
  // Date().getMonth()`) so the bucket never shifts with the viewer's
  // timezone.
  const monthTotals = new Array(12).fill(0);
  activeTxs.forEach(t => {
    if (!t.date) return;
    const monthIndex = Number(t.date.slice(5, 7)) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      monthTotals[monthIndex] += (t.litres || 0);
    }
  });

  const monthLabels = MONTH_LABELS[getCurrentLanguage() === 'en' ? 'en' : 'pt'];
  const themePrimary = role === 'bakers' ? '#DB7806' : '#104CCF';

  if (donutChartInstance) donutChartInstance.destroy();

  donutChartInstance = new Chart(monthlyCanvas, {
    type: 'bar',
    data: {
      labels: monthLabels,
      datasets: [{
        label: t('chartVolumeLabel'),
        data: monthTotals,
        backgroundColor: themePrimary,
        borderRadius: 6,
        maxBarThickness: 32
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

  // 2. Trend Chart — the real, cross-company "Net balance over time" (same
  // running total after each transaction as the old dashboard's chart)
  // when the ledger is available (admin sessions only, see
  // loadLedgerIfAdmin()); otherwise falls back to this company's own
  // cumulative volume, since a non-admin session has no access to the
  // cross-company balance at all.
  if (trendChartInstance) trendChartInstance.destroy();

  const trendTitleEl = document.getElementById('trendTitle');
  const trendSubtitleEl = document.getElementById('trendSubtitle');

  if (ledgerData) {
    if (trendTitleEl) trendTitleEl.textContent = t('netBalanceTrendTitle');
    if (trendSubtitleEl) trendSubtitleEl.textContent = t('netBalanceTrendSubtitle');
    trendChartInstance = renderNetBalanceChart(trendCanvas);
  } else {
    if (trendTitleEl) trendTitleEl.textContent = t('trendTitle');
    if (trendSubtitleEl) trendSubtitleEl.textContent = t('trendSubtitle');
    trendChartInstance = renderVolumeTrendChart(trendCanvas, activeTxs, role);
  }
}

/**
 * Cumulative volume trend (this company's own transactions only) — the
 * fallback for non-admin sessions, who can't reach the cross-company
 * ledger. Same "running total after each date" mechanic, applied to
 * litres instead of the balance.
 */
function renderVolumeTrendChart(canvas, activeTxs, role) {
  const dateMap = {};
  const sorted = [...activeTxs].sort((a, b) => (a.date > b.date ? 1 : -1));
  sorted.forEach(tItem => {
    dateMap[tItem.date] = (dateMap[tItem.date] || 0) + (tItem.litres || 0);
  });

  const trendLabels = Object.keys(dateMap);
  let runningVolume = 0;
  const trendData = trendLabels.map(date => {
    runningVolume += dateMap[date];
    return runningVolume;
  });

  const themeColor = role === 'bakers' ? '#DB7806' : '#104CCF';
  const themeBg = role === 'bakers' ? 'rgba(219, 120, 6, 0.14)' : 'rgba(16, 76, 207, 0.14)';

  return new Chart(canvas, {
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

/**
 * Real Net Balance over time — one point per transaction, both companies
 * combined chronologically (LedgerController::buildLedger()'s exact order,
 * reconstructed by merging its already-split fuellink/bakers arrays back
 * together and re-sorting with the same comparator). Blue while the
 * balance is positive, red where it dips negative — same divergence idea
 * as the old dashboard's SVG chart, using the app's own blue instead of
 * green. Hovering a point shows date/type/detail/balance, same 4 lines as
 * the old dashboard's tooltip.
 */
function renderNetBalanceChart(canvas) {
  const entries = [...(ledgerData.fuellink || []), ...(ledgerData.bakers || [])]
    .sort((a, b) => {
      const dateCmp = (a.date || '').localeCompare(b.date || '');
      return dateCmp !== 0 ? dateCmp : (a.created_at || '').localeCompare(b.created_at || '');
    });

  const balances = entries.map(e => Number(e.running_balance || 0));
  const positiveColor = '#104CCF';
  const negativeColor = '#E2334D';
  const segmentColor = (ctx, posColor, negColor) => {
    const avg = ((ctx.p0.parsed.y || 0) + (ctx.p1.parsed.y || 0)) / 2;
    return avg >= 0 ? posColor : negColor;
  };

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: entries.length > 0 ? entries.map((_, i) => i + 1) : [t('noChartData')],
      datasets: [{
        label: t('netBalanceTrendTitle'),
        data: balances.length > 0 ? balances : [0],
        borderColor: positiveColor,
        backgroundColor: 'rgba(16, 76, 207, 0.14)',
        borderWidth: 2.5,
        tension: 0,
        fill: 'origin',
        pointBackgroundColor: (ctx) => (balances[ctx.dataIndex] >= 0 ? positiveColor : negativeColor),
        pointRadius: 3,
        segment: {
          borderColor: (ctx) => segmentColor(ctx, positiveColor, negativeColor),
          backgroundColor: (ctx) => segmentColor(ctx, 'rgba(16, 76, 207, 0.14)', 'rgba(226, 51, 77, 0.14)')
        }
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          grid: { color: 'rgba(226, 232, 240, 0.6)' },
          ticks: {
            font: { size: 11 },
            callback: (value) => `R ${Number(value).toLocaleString('en-ZA')}`
          }
        },
        x: {
          grid: { display: false },
          ticks: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => entries[items[0].dataIndex]?.date || '',
            label: (ctx) => {
              const entry = entries[ctx.dataIndex];
              if (!entry) return '';
              const balance = Number(entry.running_balance || 0);
              return [
                typeLabel(entry.type),
                entry.detail || '',
                `${t('balanceLabel')}: R ${balance.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              ];
            }
          }
        }
      }
    }
  });
}

function typeLabel(type) {
  if (type === 'diesel') return t('typeDiesel');
  if (type === 'logistics') return t('typeLogistics');
  if (type === 'void') return t('typeVoid');
  return t('typeSettlement');
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
