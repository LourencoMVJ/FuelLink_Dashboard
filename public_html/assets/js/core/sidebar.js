/**
 * Sidebar Navigation Component
 * Provides responsive sidebar layout, active screen state, company theming, pin/unpin action,
 * hover-to-expand behavior when unpinned, and compact logout icon.
 */
import { signOut } from './auth.js';
import { t } from './i18n.js';

export function initSidebar(activePage = 'dashboard', userSession = null) {
  const sidebarContainer = document.getElementById('globalSidebar');
  if (!sidebarContainer) return;

  const role = userSession?.role || 'fuellink';
  const roleName = role === 'bakers' ? 'Bankers Tankers' : 'FuelLink';
  const userEmail = userSession?.session?.user?.email || (role === 'bakers' ? 'shads@bakers.co.za' : 'shads@fuelink.co.za');
  const userInitials = role === 'bakers' ? 'BT' : 'FL';

  // Check if sidebar is pinned (default is false: compact unpinned mode)
  let isPinned = localStorage.getItem('sidebar_pinned') === 'true';
  const appContainer = document.querySelector('.app-container');

  sidebarContainer.innerHTML = `
    <div class="sidebar-wrapper ${role} ${isPinned ? 'pinned' : 'collapsed'}" id="sidebarWrapper">
      
      <!-- Top Header / Logo with Pin Action -->
      <div class="sidebar-header" id="sidebarHeader">
        <div class="brand-logo-circle ${role}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
          </svg>
        </div>
        <div class="brand-info">
          <h2 class="brand-name">${roleName}</h2>
          <span class="brand-sub">${t('operationalManagement')}</span>
        </div>
        <button type="button" class="btn-sidebar-pin ${isPinned ? 'active' : ''}" id="sidebarPinBtn" title="${isPinned ? 'Desafixar barra lateral (recolhe automaticamente)' : 'Fixar barra lateral aberta'}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="17" x2="12" y2="22"></line>
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.77V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.77a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24Z"></path>
          </svg>
        </button>
      </div>

      <!-- Navigation Links -->
      <nav class="sidebar-nav">
        <a href="dashboard.html" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}" title="${t('dashboard')}" data-page="dashboard">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </span>
          <span class="nav-label">${t('dashboard')}</span>
        </a>

        <a href="operations.html" class="nav-item ${activePage === 'operations' ? 'active' : ''}" title="${t('operations')}" data-page="operations">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </span>
          <span class="nav-label">${t('operations')}</span>
        </a>
      </nav>

      <!-- User Profile & Sign Out Footer (When closed, logout button replaces profile avatar) -->
      <div class="sidebar-footer" id="sidebarFooter">
        <div class="user-card" id="sidebarUserCard">
          <div class="user-avatar ${role}" title="${userEmail}">
            <span>${userInitials}</span>
          </div>
          <div class="user-details">
            <span class="user-name">${userEmail.split('@')[0]}</span>
            <span class="user-role-badge">${roleName}</span>
          </div>
          <button type="button" class="btn-logout" id="sidebarLogoutBtn" title="${t('logout')} (Sair)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  const sidebarWrapper = document.getElementById('sidebarWrapper');
  const pinBtn = document.getElementById('sidebarPinBtn');
  const logoutBtn = document.getElementById('sidebarLogoutBtn');

  function updatePinState(pinned) {
    isPinned = pinned;
    localStorage.setItem('sidebar_pinned', pinned ? 'true' : 'false');
    
    if (pinned) {
      sidebarWrapper?.classList.remove('collapsed', 'hover-expanded');
      sidebarWrapper?.classList.add('pinned');
      appContainer?.classList.remove('sidebar-is-collapsed');
      if (pinBtn) {
        pinBtn.classList.add('active');
        pinBtn.title = 'Desafixar barra lateral (recolhe automaticamente)';
        const svg = pinBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', 'currentColor');
      }
    } else {
      sidebarWrapper?.classList.remove('pinned', 'hover-expanded');
      sidebarWrapper?.classList.add('collapsed');
      appContainer?.classList.add('sidebar-is-collapsed');
      if (pinBtn) {
        pinBtn.classList.remove('active');
        pinBtn.title = 'Fixar barra lateral aberta';
        const svg = pinBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', 'none');
      }
    }
  }

  // Initial state setup
  updatePinState(isPinned);

  // Hover near/away behavior (when unpinned)
  sidebarContainer.addEventListener('mouseenter', () => {
    if (!isPinned) {
      sidebarWrapper?.classList.remove('collapsed');
      sidebarWrapper?.classList.add('hover-expanded');
    }
  });

  sidebarContainer.addEventListener('mouseleave', () => {
    if (!isPinned) {
      sidebarWrapper?.classList.remove('hover-expanded');
      sidebarWrapper?.classList.add('collapsed');
    }
  });

  // Pin button click handler
  pinBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    updatePinState(!isPinned);
  });

  // Logout click handler
  logoutBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    await signOut();
    window.location.href = 'login.html';
  });
}
