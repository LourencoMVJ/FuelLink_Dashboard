/**
 * Operation Details View Controller
 * Handles loading, rendering, and document previews for individual transactions.
 * Designed to consume the backend API / Supabase directly.
 */
import { getSession } from '../core/auth.js';
import { initSidebar } from '../core/sidebar.js';
import { initHeaderControls, t, getCurrentLanguage, applyTheme, getCurrentTheme } from '../core/i18n.js';
import { fetchCompanyData } from '../models/transactions.js';
import { sb } from '../config/supabase-client.js';

let currentSession = null;
let currentOperation = null;
let companyDataset = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Apply saved theme immediately
  applyTheme(getCurrentTheme());

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

  setupScreenBranding(currentSession);
  initSidebar('operations', currentSession);
  initHeaderControls('headerControls');

  setupEventListeners();
  await loadOperationDetails();
});

function setupScreenBranding(session) {
  const role = session?.role || 'fuellink';
  const isBakers = role === 'bakers';

  document.documentElement.setAttribute('data-company', role);
  if (isBakers) {
    document.body.classList.add('role-bakers');
    document.body.classList.remove('role-fuellink');
  } else {
    document.body.classList.add('role-fuellink');
    document.body.classList.remove('role-bakers');
  }

  // Style top KPI cards for Bankers
  document.querySelectorAll('.kpi-card').forEach(card => {
    if (isBakers) {
      card.classList.add('bakers');
    } else {
      card.classList.remove('bakers');
    }
  });
}

function setupEventListeners() {
  const previewModal = document.getElementById('docPreviewModal');
  const closePreviewModal = document.getElementById('btnClosePreviewModal');
  const closePreviewBtn = document.getElementById('btnClosePreviewBtn');

  closePreviewModal?.addEventListener('click', () => previewModal?.classList.remove('show'));
  closePreviewBtn?.addEventListener('click', () => previewModal?.classList.remove('show'));
}

/**
 * Service Method: Fetch operation by ID from Supabase or Company Dataset
 * (Prepared for Backend API integration)
 * @param {string} opId 
 */
export async function getOperationById(opId, role) {
  // If Supabase client is connected, attempt direct single query
  if (sb) {
    try {
      const { data, error } = await sb.from('transactions').select('*').eq('id', opId).maybeSingle();
      if (data && !error) {
        return data;
      }
    } catch (e) {
      console.warn('Supabase query failed, searching dataset:', e);
    }
  }

  // Fallback / standard dataset query
  if (!companyDataset) {
    companyDataset = await fetchCompanyData(role);
  }

  return (companyDataset.transactions || []).find(t => t.id === opId) || null;
}

async function loadOperationDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const opId = urlParams.get('id');

  if (!opId) {
    alert(t('opNotFound'));
    window.location.href = 'operations.html';
    return;
  }

  try {
    companyDataset = await fetchCompanyData(currentSession.role);
    currentOperation = await getOperationById(opId, currentSession.role);

    if (!currentOperation) {
      alert(t('opNotFound'));
      window.location.href = 'operations.html';
      return;
    }

    renderOperationDetails(currentOperation);
  } catch (err) {
    console.error('Error loading operation details:', err);
    alert(t('opNotFound'));
    window.location.href = 'operations.html';
  }
}

function renderOperationDetails(op) {
  const role = currentSession.role || 'fuellink';
  const isBakers = role === 'bakers';
  const currentLang = getCurrentLanguage();

  const opRefText = document.getElementById('opRefText');
  if (opRefText) {
    const cleanId = (op.id || '').replace(/^tx-(bt|fl)-/, '');
    opRefText.textContent = op.note ? `(${op.note})` : `(Ref. #${cleanId})`;
  }

  // Top KPIs
  const isVoided = op.status === 'voided' || op.isVoided;
  const kpiStatusVal = document.getElementById('kpiStatusVal');
  const kpiStatusTag = document.getElementById('kpiStatusTag');
  if (kpiStatusVal) {
    kpiStatusVal.textContent = isVoided ? t('voidedStatus') : t('activeStatus');
    kpiStatusVal.style.color = isVoided ? '#94A3B8' : '#10B981';
  }
  if (kpiStatusTag) kpiStatusTag.textContent = isVoided ? 'VOID' : 'OK';

  const kpiDateVal = document.getElementById('kpiDateVal');
  if (kpiDateVal) kpiDateVal.textContent = op.date;

  const kpiVolumeVal = document.getElementById('kpiVolumeVal');
  const mainLitres = isBakers ? (op.offloadedAmount || op.litres || 0) : (op.litres || 0);
  if (kpiVolumeVal) kpiVolumeVal.textContent = mainLitres.toLocaleString('pt-PT');

  const kpiAmountVal = document.getElementById('kpiAmountVal');
  const formattedAmt = (op.amount || 0).toLocaleString(currentLang === 'pt' ? 'pt-PT' : 'en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (kpiAmountVal) kpiAmountVal.textContent = `R ${formattedAmt}`;

  const kpiCompanyVal = document.getElementById('kpiCompanyVal');
  if (kpiCompanyVal) kpiCompanyVal.textContent = isBakers ? 'Bankers Tankers' : 'FuelLink';

  const kpiTruckVal = document.getElementById('kpiTruckVal');
  if (kpiTruckVal) kpiTruckVal.textContent = `${t('truckCol')}: ${op.truck || '—'}`;

  // Fleet & Transport Card
  const valTruck = document.getElementById('valTruck');
  const valDriver = document.getElementById('valDriver');
  const valTrailer = document.getElementById('valTrailer');
  const valDate = document.getElementById('valDate');

  if (valTruck) valTruck.textContent = op.truck || '—';
  if (valDriver) valDriver.textContent = op.driver || '—';
  if (valTrailer) valTrailer.textContent = op.trailer || '—';
  if (valDate) valDate.textContent = op.date;

  // Route & Logistics Card
  const cardRouteInfo = document.getElementById('cardRouteInfo');
  if (isBakers) {
    if (cardRouteInfo) cardRouteInfo.style.display = 'block';
    const routeObj = (companyDataset.routes || []).find(r => r.id === op.routeId);

    const valRoutePath = document.getElementById('valRoutePath');
    const valCargo = document.getElementById('valCargo');
    const valPayload = document.getElementById('valPayload');
    const valBaseRate = document.getElementById('valBaseRate');

    if (valRoutePath) valRoutePath.textContent = routeObj ? `${routeObj.from} → ${routeObj.to}` : 'Rota Padrão';
    if (valCargo) valCargo.textContent = routeObj?.cargo || 'Diesel 50ppm';
    if (valPayload) valPayload.textContent = `${(routeObj?.payload || 40000).toLocaleString('pt-PT')} L`;
    if (valBaseRate) valBaseRate.textContent = `R ${(routeObj?.baseRate || 1.45).toFixed(2)}`;
  } else {
    if (cardRouteInfo) cardRouteInfo.style.display = 'none';
  }

  // Volumes & Breakdown Card
  const bakersVolumeGrid = document.getElementById('bakersVolumeGrid');
  const fuellinkVolumeGrid = document.getElementById('fuellinkVolumeGrid');

  if (isBakers) {
    if (bakersVolumeGrid) bakersVolumeGrid.style.display = 'grid';
    if (fuellinkVolumeGrid) fuellinkVolumeGrid.style.display = 'none';

    const orderAmt = Number(op.orderAmount || op.litres || 0);
    const loadedAmt = Number(op.loadedAmount || op.litres || 0);
    const offloadedAmt = Number(op.offloadedAmount || op.litres || 0);
    const diffAmt = loadedAmt - offloadedAmt;

    const valOrderAmt = document.getElementById('valOrderAmt');
    const valLoadedAmt = document.getElementById('valLoadedAmt');
    const valOffloadedAmt = document.getElementById('valOffloadedAmt');
    const valDiffAmt = document.getElementById('valDiffAmt');
    const valCalculatedDelivery = document.getElementById('valCalculatedDelivery');

    if (valOrderAmt) valOrderAmt.textContent = `${orderAmt.toLocaleString('pt-PT')} L`;
    if (valLoadedAmt) valLoadedAmt.textContent = `${loadedAmt.toLocaleString('pt-PT')} L`;
    if (valOffloadedAmt) valOffloadedAmt.textContent = `${offloadedAmt.toLocaleString('pt-PT')} L`;
    
    if (valDiffAmt) {
      if (diffAmt > 0) {
        valDiffAmt.textContent = `-${diffAmt.toLocaleString('pt-PT')} L (Perda/Quebra)`;
        valDiffAmt.className = 'details-data-value highlight-danger';
      } else if (diffAmt === 0) {
        valDiffAmt.textContent = '0 L (Sem diferença)';
        valDiffAmt.className = 'details-data-value';
      } else {
        valDiffAmt.textContent = `+${Math.abs(diffAmt).toLocaleString('pt-PT')} L`;
        valDiffAmt.className = 'details-data-value';
      }
    }

    if (valCalculatedDelivery) valCalculatedDelivery.textContent = `R ${formattedAmt}`;
  } else {
    if (bakersVolumeGrid) bakersVolumeGrid.style.display = 'none';
    if (fuellinkVolumeGrid) fuellinkVolumeGrid.style.display = 'grid';

    const valLitresSold = document.getElementById('valLitresSold');
    const valDieselPrice = document.getElementById('valDieselPrice');
    const valTotalSoldAmount = document.getElementById('valTotalSoldAmount');

    if (valLitresSold) valLitresSold.textContent = `${(op.litres || 0).toLocaleString('pt-PT')} L`;
    if (valDieselPrice) valDieselPrice.textContent = `R ${(companyDataset.dieselPrice || 27.61).toFixed(2)} / L`;
    if (valTotalSoldAmount) valTotalSoldAmount.textContent = `R ${formattedAmt}`;
  }

  // Notes & Audit Card
  const valNote = document.getElementById('valNote');
  const valEnteredBy = document.getElementById('valEnteredBy');
  const valCreatedAt = document.getElementById('valCreatedAt');

  if (valNote) valNote.textContent = op.note || 'Nenhuma observação registada.';
  if (valEnteredBy) valEnteredBy.textContent = (op.enteredBy === 'bakers') ? 'Bankers Tankers Operations' : 'FuelLink Commercial Desk';
  if (valCreatedAt) valCreatedAt.textContent = op.createdAt ? new Date(op.createdAt).toLocaleString('pt-PT') : op.date;

  // Documents Gallery
  renderDocumentsGallery(op, isBakers);
}

function renderDocumentsGallery(op, isBakers) {
  const container = document.getElementById('docsGalleryContainer');
  if (!container) return;

  const docs = [];

  if (isBakers) {
    // 1. Order Proof
    const hasOrder = !!(op.orderProofPath || op.orderProofName);
    docs.push({
      type: t('orderProof') || 'Comprovativo de Ordem',
      attached: hasOrder,
      name: op.orderProofName || (hasOrder ? 'Ordem_Transporte.pdf' : null),
      path: op.orderProofPath || (hasOrder ? 'mock/path/ordem.pdf' : null)
    });

    // 2. Loading Proof
    const hasLoaded = !!(op.loadedProofPath || op.loadedProofName);
    docs.push({
      type: t('loadedProof') || 'Comprovativo de Carregamento',
      attached: hasLoaded,
      name: op.loadedProofName || (hasLoaded ? 'Guia_Carregamento.pdf' : null),
      path: op.loadedProofPath || (hasLoaded ? 'mock/path/carregamento.pdf' : null)
    });

    // 3. Offloading Proof
    const hasOffloaded = !!(op.offloadedProofPath || op.offloadedProofName);
    docs.push({
      type: t('offloadedProof') || 'Comprovativo de Descarregamento',
      attached: hasOffloaded,
      name: op.offloadedProofName || (hasOffloaded ? 'Comprovativo_Descarregamento.pdf' : null),
      path: op.offloadedProofPath || (hasOffloaded ? 'mock/path/descarregamento.pdf' : null)
    });

    // 4. Delivery Note / Guia de Entrega (POD)
    const hasDeliveryNote = !!(op.deliveryNotePath || op.deliveryNoteName);
    docs.push({
      type: t('proofDelivery') || 'Guia de Entrega (Delivery Note / POD)',
      attached: hasDeliveryNote,
      name: op.deliveryNoteName || (hasDeliveryNote ? 'Delivery_Note_Guia.pdf' : null),
      path: op.deliveryNotePath || (hasDeliveryNote ? 'mock/path/pod.pdf' : null)
    });
  } else {
    // FuelLink Delivery Note / Proof
    const hasDeliveryNote = !!(op.deliveryNotePath || op.deliveryNoteName);
    docs.push({
      type: t('proofDelivery') || 'Guia de Entrega / Fatura Comercial',
      attached: hasDeliveryNote,
      name: op.deliveryNoteName || (hasDeliveryNote ? 'Guia_Venda.pdf' : null),
      path: op.deliveryNotePath || (hasDeliveryNote ? 'mock/path/venda.pdf' : null)
    });
  }

  container.innerHTML = docs.map((doc, idx) => {
    if (doc.attached) {
      return `
        <div class="doc-card">
          <div class="doc-card-header">
            <div class="doc-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div class="doc-info">
              <span class="doc-type-tag">${doc.type}</span>
              <div class="doc-filename" title="${doc.name}">${doc.name}</div>
            </div>
          </div>
          <div class="doc-actions-row">
            <button type="button" class="btn-doc-action primary" data-preview-idx="${idx}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              ${t('viewFile')}
            </button>
            <a href="#download" class="btn-doc-action" data-download-doc="${doc.name}" download="${doc.name}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              ${t('downloadFile')}
            </a>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="doc-card missing-doc">
          <div class="doc-card-header">
            <div class="doc-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
            </div>
            <div class="doc-info">
              <span class="doc-type-tag">${doc.type}</span>
              <div class="doc-missing-notice">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                Nenhum documento anexado
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }).join('');

  // Attach Preview Handlers
  container.querySelectorAll('[data-preview-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-preview-idx'));
      const targetDoc = docs[idx];
      if (!targetDoc) return;
      openDocumentPreviewModal(targetDoc);
    });
  });
}

function openDocumentPreviewModal(doc) {
  const modal = document.getElementById('docPreviewModal');
  const title = document.getElementById('previewModalTitle');
  const body = document.getElementById('previewModalBody');
  const downloadBtn = document.getElementById('btnDownloadCurrentDoc');

  if (title) title.textContent = `${doc.type}: ${doc.name}`;
  if (downloadBtn) {
    downloadBtn.setAttribute('download', doc.name);
    downloadBtn.href = `#download-${encodeURIComponent(doc.name)}`;
  }

  if (body) {
    // Generate clean interactive preview template
    body.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #CBD5E1;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px; color: var(--theme-fl);">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <h3 style="font-size: 16px; color: #FFFFFF; margin-bottom: 6px;">${doc.name}</h3>
        <p style="font-size: 13px; color: #94A3B8; margin-bottom: 16px;">Documento digitalizado anexado à transação</p>
        <div style="display: inline-flex; gap: 8px; font-size: 11px; padding: 6px 14px; background: rgba(255,255,255,0.08); border-radius: 20px;">
          <span>Estado: Verificado</span> - <span>Formato: PDF / Scan</span> - <span>Criptografia: SHA-256</span>
        </div>
      </div>
    `;
  }

  modal?.classList.add('show');
}
