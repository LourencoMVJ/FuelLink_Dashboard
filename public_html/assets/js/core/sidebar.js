/**
 * Sidebar Navigation Component
 * Provides responsive sidebar layout, active screen state, company theming, and logout.
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

  const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';

  sidebarContainer.innerHTML = `
    <div class="sidebar-wrapper ${role} ${isCollapsed ? 'collapsed' : ''}" id="sidebarWrapper">
      
      <!-- Top Header / Logo (Click to Toggle Collapse/Expand) -->
      <div class="sidebar-header" id="sidebarHeaderToggle" title="Alternar menu (expandir / recolher)" style="cursor: pointer;">
        <div class="brand-logo-circle ${role}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
          </svg>
        </div>
        <div class="brand-info">
          <h2 class="brand-name">${roleName}</h2>
          <span class="brand-sub">${t('operationalManagement')}</span>
        </div>
      </div>

      <!-- Navigation Links -->
      <nav class="sidebar-nav">
        <a href="dashboard.html" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}" title="${t('dashboard')}" data-page="dashboard">
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </span>
          <span class="nav-label">${t('operations')}</span>
        </a>
      </nav>

      <!-- User Profile & Sign Out Footer -->
      <div class="sidebar-footer">
        <div class="user-card">
          <div class="user-avatar ${role}">
            <span>${userInitials}</span>
          </div>
          <div class="user-details">
            <span class="user-name">${userEmail.split('@')[0]}</span>
            <span class="user-role-badge">${roleName}</span>
          </div>
          <button type="button" class="btn-logout" id="sidebarLogoutBtn" title="${t('logout')}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  // Toggle Functionality on Header and Nav items when already active
  const headerToggle = document.getElementById('sidebarHeaderToggle');
  const sidebarWrapper = document.getElementById('sidebarWrapper');
  const appContainer = document.querySelector('.app-container');

  function toggleSidebar() {
    sidebarWrapper?.classList.toggle('collapsed');
    const collapsed = sidebarWrapper?.classList.contains('collapsed');
    appContainer?.classList.toggle('sidebar-is-collapsed', collapsed);
    localStorage.setItem('sidebar_collapsed', collapsed ? 'true' : 'false');
  }

  if (isCollapsed) {
    appContainer?.classList.add('sidebar-is-collapsed');
  }

  headerToggle?.addEventListener('click', toggleSidebar);

  // If clicked on active page icon, also toggle sidebar view
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (item.classList.contains('active')) {
        e.preventDefault();
        toggleSidebar();
      }
    });
  });

  // Handle Logout
  const logoutBtn = document.getElementById('sidebarLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await signOut();
      window.location.href = 'login.html';
    });
  }
}
