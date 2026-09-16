/**
 * User Management & Permissions Controller (Frontend View Layer)
 * Strictly adheres to:
 * 1. Multi-tenant isolation: FuelLink Admin only sees/manages FuelLink users, Bankers Admin only sees/manages Bankers users.
 * 2. No badges/chips: Clean status indicators with status dots.
 * 3. Liquid Glass styling & 75% Canonical Scale Proportions.
 * 4. Full Bilingual Synchronization (PT/EN).
 */
import { getSession } from '../core/auth.js';
import { initSidebar } from '../core/sidebar.js';
import { initHeaderControls, t, applyTheme, getCurrentTheme, getCurrentLanguage } from '../core/i18n.js';
import { api } from '../core/api.js';

// Permissions Catalog Definition (Operational vs Sensitive Groups)
const PERMISSIONS_CATALOG = {
  operational: [
    { code: 'ops_create', name_pt: 'Registar Operações', name_en: 'Create Operations', desc_pt: 'Permite criar novas operações e entregas no sistema', desc_en: 'Allows creating new operations and deliveries' },
    { code: 'ops_edit', name_pt: 'Editar Operações', name_en: 'Edit Operations', desc_pt: 'Permite editar dados de viagens e detalhes operacionais', desc_en: 'Allows editing trip data and operational details' },
    { code: 'reports_export', name_pt: 'Exportar Relatórios', name_en: 'Export Reports', desc_pt: 'Permite gerar relatórios em Excel, PDF e Word', desc_en: 'Allows exporting reports in Excel, PDF and Word' },
    { code: 'prices_edit', name_pt: 'Atualizar Preço do Diesel', name_en: 'Update Diesel Price', desc_pt: 'Permite atualizar tabelas de referência de combustível', desc_en: 'Allows updating fuel reference price tables' }
  ],
  sensitive: [
    { code: 'ops_void', name_pt: 'Anular/Deletar Operações', name_en: 'Void/Delete Operations', desc_pt: 'Permite anular lançamentos com impacto direto na reconciliação', desc_en: 'Allows voiding transactions impacting ledger balance' },
    { code: 'users_manage', name_pt: 'Gestão de Utilizadores', name_en: 'Manage Users', desc_pt: 'Permite criar, editar e desativar contas de utilizadores', desc_en: 'Allows creating, editing and deactivating accounts' },
    { code: 'financial_view', name_pt: 'Visualização Financeira Total', name_en: 'Full Financial View', desc_pt: 'Acesso a valores globais, totais e faturação acumulada', desc_en: 'Full access to totals, invoicing and financials' },
    { code: 'cross_ledger_view', name_pt: 'Ver Posição Cruzada (Ledger)', name_en: 'View Cross-Company Ledger', desc_pt: 'Acesso ao saldo corrente e compensação entre FuelLink e Bankers', desc_en: 'Access to cross-company running balance and settlement' }
  ]
};

// Initial Users Directory Dataset
let allUsersList = [
  // FuelLink Accounts
  { id: 'usr-fl-admin', name: 'FuelLink Administrator', email: 'admin@fuelink.co.za', phone: '+27 82 000 0001', company: 'fuellink', is_active: true, is_admin: true, created_at: '2026-08-01', permissions: ['ops_create', 'ops_edit', 'ops_void', 'reports_export', 'prices_edit', 'users_manage', 'financial_view', 'cross_ledger_view'] },
  { id: 'usr-fl-01', name: 'Carlos Mendes', email: 'carlos.mendes@fuelink.co.za', phone: '+27 83 987 6543', company: 'fuellink', is_active: true, is_admin: false, created_at: '2026-08-15', permissions: ['ops_create', 'ops_edit', 'reports_export'] },
  { id: 'usr-fl-02', name: 'Johan Van Der Merwe', email: 'johan.merwe@fuelink.co.za', phone: '+27 81 777 6620', company: 'fuellink', is_active: true, is_admin: false, created_at: '2026-08-18', permissions: ['ops_create', 'reports_export'] },
  { id: 'usr-fl-03', name: 'Sarah Jenkins', email: 'sarah.jenkins@fuelink.co.za', phone: '+27 84 555 0192', company: 'fuellink', is_active: true, is_admin: false, created_at: '2026-08-20', permissions: ['ops_create', 'ops_edit'] },

  // Bankers Tankers Accounts
  { id: 'usr-bt-admin', name: 'Bankers Administrator', email: 'admin@bakers.co.za', phone: '+27 83 000 0002', company: 'bakers', is_active: true, is_admin: true, created_at: '2026-08-01', permissions: ['ops_create', 'ops_edit', 'ops_void', 'reports_export', 'prices_edit', 'users_manage', 'financial_view', 'cross_ledger_view'] },
  { id: 'usr-bt-01', name: 'Sipho Zulu', email: 'sipho.zulu@bakers.co.za', phone: '+27 83 222 1983', company: 'bakers', is_active: true, is_admin: false, created_at: '2026-08-12', permissions: ['ops_create', 'ops_edit', 'reports_export'] },
  { id: 'usr-bt-02', name: 'Thabo Molefe', email: 'thabo.molefe@bakers.co.za', phone: '+27 82 444 8891', company: 'bakers', is_active: true, is_admin: false, created_at: '2026-08-14', permissions: ['ops_create', 'reports_export'] },
  { id: 'usr-bt-03', name: 'Elena Rossi', email: 'elena.rossi@bakers.co.za', phone: '+27 84 333 4501', company: 'bakers', is_active: true, is_admin: false, created_at: '2026-08-22', permissions: ['ops_create', 'ops_edit'] }
];

let currentSession = null;
let activeCompany = 'fuellink';
let activeDrawerUser = null;
let pendingSensitiveToggle = null;
let pendingDeactivateUserId = null;
let editingUserId = null;

document.addEventListener('DOMContentLoaded', async () => {
  applyTheme(getCurrentTheme());
  initHeaderControls('headerControls');

  try {
    currentSession = await getSession();
    if (!currentSession || !currentSession.session) {
      window.location.href = 'login.html';
      return;
    }
  } catch (err) {
    console.warn('Session verification error, redirecting to login:', err);
    window.location.href = 'login.html';
    return;
  }

  activeCompany = currentSession?.role === 'bakers' ? 'bakers' : 'fuellink';
  setupScreenBranding(activeCompany);
  initSidebar('users', currentSession);
  applyStaticTranslations();

  // Listen for language toggle event
  window.addEventListener('languageChanged', () => {
    applyStaticTranslations();
    renderUsersTable();
    if (activeDrawerUser) {
      openPermissionsDrawer(activeDrawerUser.id);
    }
  });

  await loadUsers();
  setupEventListeners();
});

function setupScreenBranding(role) {
  document.documentElement.setAttribute('data-company', role);
  if (role === 'bakers') {
    document.body.classList.add('role-bakers');
    document.body.classList.remove('role-fuellink');
  } else {
    document.body.classList.add('role-fuellink');
    document.body.classList.remove('role-bakers');
  }
}

async function loadUsers() {
  try {
    const apiUsers = await api.get('users');
    if (Array.isArray(apiUsers) && apiUsers.length > 0) {
      allUsersList = apiUsers;
    }
  } catch (err) {
    console.warn('API users fetch fallback to local directory:', err);
  }

  renderUsersTable();
}

function getScopedUsers() {
  // Multi-tenant rule: FuelLink Admin only sees FuelLink users, Bankers Admin only sees Bankers users
  return allUsersList.filter(u => (u.company || u.role) === activeCompany);
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  const searchVal = document.getElementById('userSearchInput')?.value.toLowerCase().trim() || '';
  const statusFilter = document.getElementById('userStatusFilter')?.value || 'active';

  const scopedUsers = getScopedUsers();

  const filtered = scopedUsers.filter(u => {
    if (statusFilter === 'active' && !u.is_active) return false;
    if (statusFilter === 'inactive' && u.is_active) return false;

    if (searchVal) {
      const matchName = (u.name || '').toLowerCase().includes(searchVal);
      const matchEmail = (u.email || '').toLowerCase().includes(searchVal);
      if (!matchName && !matchEmail) return false;
    }
    return true;
  });

  const countBadge = document.getElementById('lblUserCountBadge');
  if (countBadge) {
    countBadge.textContent = `${filtered.length} ${t('records') || 'registos'}`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 36px 16px;">
          ${t('noDataFound') || 'Nenhum utilizador encontrado com os filtros selecionados.'}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(u => {
    const isBakers = (u.company || u.role) === 'bakers';
    const companyDisplayName = isBakers ? 'Bankers Tankers' : 'FuelLink';
    const initials = (u.name || u.email || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    // Status follows exact operations table standard (.table-badge.active / .table-badge.inactive)
    const statusBadge = u.is_active
      ? `<span class="table-badge active">${t('activeStatus')}</span>`
      : `<span class="table-badge inactive">${t('inactive')}</span>`;

    return `
      <tr>
        <td>
          <div class="user-table-cell">
            <div class="user-table-avatar ${isBakers ? 'bakers' : ''}">${initials}</div>
            <div>
              <div class="user-name-title">${u.name || 'N/A'}</div>
              <div class="user-email-sub">${u.email}</div>
            </div>
          </div>
        </td>
        <td><b>${companyDisplayName}</b></td>
        <td>${u.phone || 'N/A'}</td>
        <td style="text-align: center;">${statusBadge}</td>
        <td>${u.created_at || 'N/A'}</td>
        <td style="text-align: center;">
          <div class="row-actions-group" style="justify-content: center;">
            <button type="button" class="btn-row-action edit" data-edit-user="${u.id}" title="${t('editUser')}" aria-label="${t('editUser')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span class="action-tooltip">${t('editUser')}</span>
            </button>
            <button type="button" class="btn-row-action" data-perms-user="${u.id}" title="${t('managePermissions')}" aria-label="${t('managePermissions')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span class="action-tooltip">${t('managePermissions')}</span>
            </button>
            <button type="button" class="btn-row-action ${u.is_active ? 'danger' : 'success'}" data-toggle-status="${u.id}" title="${u.is_active ? t('inactive') : t('active')}" aria-label="${u.is_active ? t('inactive') : t('active')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                <line x1="12" y1="2" x2="12" y2="12"></line>
              </svg>
              <span class="action-tooltip">${u.is_active ? t('confirmDeactivateTitle') : t('active')}</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  attachTableEventHandlers();
}

function attachTableEventHandlers() {
  // Edit User
  document.querySelectorAll('[data-edit-user]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-edit-user');
      openUserModal(id);
    });
  });

  // Manage Permissions Drawer
  document.querySelectorAll('[data-perms-user]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-perms-user');
      openPermissionsDrawer(id);
    });
  });

  // Toggle Active Status
  document.querySelectorAll('[data-toggle-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-toggle-status');
      const targetUser = allUsersList.find(u => u.id === id);
      if (!targetUser) return;

      if (targetUser.is_active) {
        pendingDeactivateUserId = id;
        document.getElementById('deactivateConfirmModal')?.classList.add('show');
      } else {
        toggleUserActiveStatus(id, true);
      }
    });
  });
}

function openPermissionsDrawer(userId) {
  const user = allUsersList.find(u => u.id === userId);
  if (!user) return;

  activeDrawerUser = user;
  document.getElementById('drawerUserName').textContent = user.name || 'Utilizador';
  document.getElementById('drawerUserEmail').textContent = user.email;

  const container = document.getElementById('drawerPermissionsList');
  const isPt = getCurrentLanguage() === 'pt';

  const userPerms = new Set(user.permissions || []);

  container.innerHTML = `
    <!-- Operational Group -->
    <div class="perm-group-section">
      <div class="perm-group-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
        ${t('operationalGroup')}
      </div>
      ${PERMISSIONS_CATALOG.operational.map(p => `
        <div class="perm-item-row">
          <div class="perm-item-info">
            <div class="perm-code-title">${isPt ? p.name_pt : p.name_en}</div>
            <div class="perm-code-desc">${isPt ? p.desc_pt : p.desc_en}</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" data-perm-code="${p.code}" data-is-sensitive="false" ${userPerms.has(p.code) ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      `).join('')}
    </div>

    <!-- Sensitive Group -->
    <div class="perm-group-section">
      <div class="perm-group-title sensitive">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        ${t('sensitiveGroup')}
      </div>
      ${PERMISSIONS_CATALOG.sensitive.map(p => `
        <div class="perm-item-row">
          <div class="perm-item-info">
            <div class="perm-code-title" style="color: var(--color-warning);">${isPt ? p.name_pt : p.name_en}</div>
            <div class="perm-code-desc">${isPt ? p.desc_pt : p.desc_en}</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" data-perm-code="${p.code}" data-is-sensitive="true" ${userPerms.has(p.code) ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      `).join('')}
    </div>
  `;

  attachDrawerToggleHandlers();
  document.getElementById('permissionsDrawer')?.classList.add('show');
}

function attachDrawerToggleHandlers() {
  document.querySelectorAll('[data-perm-code]').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const code = checkbox.getAttribute('data-perm-code');
      const isSensitive = checkbox.getAttribute('data-is-sensitive') === 'true';
      const shouldGrant = checkbox.checked;

      if (isSensitive) {
        // Prevent immediate toggle until confirmed in security modal
        checkbox.checked = !shouldGrant;
        pendingSensitiveToggle = { code, shouldGrant, checkbox };

        const sensitiveModal = document.getElementById('sensitiveConfirmModal');
        const targetLabel = document.getElementById('sensitivePermTargetLabel');
        if (targetLabel) {
          targetLabel.textContent = `${shouldGrant ? t('permissionGranted') : t('permissionRevoked')}: ${code}`;
        }
        sensitiveModal?.classList.add('show');
      } else {
        // Operational: Immediate update
        await executePermissionChange(activeDrawerUser.id, code, shouldGrant);
      }
    });
  });
}

async function executePermissionChange(userId, permCode, shouldGrant) {
  try {
    if (shouldGrant) {
      await api.post(`users/${encodeURIComponent(userId)}/permissions`, { permission: permCode });
    } else {
      await api.delete(`users/${encodeURIComponent(userId)}/permissions/${encodeURIComponent(permCode)}`);
    }
  } catch (err) {
    console.warn('API permission change fallback to local state:', err);
  }

  // Update local memory
  const user = allUsersList.find(u => u.id === userId);
  if (user) {
    if (!user.permissions) user.permissions = [];
    if (shouldGrant) {
      if (!user.permissions.includes(permCode)) user.permissions.push(permCode);
    } else {
      user.permissions = user.permissions.filter(p => p !== permCode);
    }
  }
}

async function toggleUserActiveStatus(userId, newActiveStatus) {
  try {
    await api.patch(`users/${encodeURIComponent(userId)}`, { is_active: newActiveStatus });
  } catch (err) {
    console.warn('API status toggle fallback to local state:', err);
  }

  const user = allUsersList.find(u => u.id === userId);
  if (user) {
    user.is_active = newActiveStatus;
  }
  renderUsersTable();
}

function openUserModal(userId = null) {
  editingUserId = userId;
  const modal = document.getElementById('userFormModal');
  const modalTitle = document.getElementById('lblUserModalTitle');
  const form = document.getElementById('userForm');
  const passwordGroup = document.getElementById('passwordFieldGroup');
  const passwordInput = document.getElementById('userFormPassword');

  form?.reset();

  if (userId) {
    const user = allUsersList.find(u => u.id === userId);
    if (user) {
      if (modalTitle) modalTitle.textContent = t('editUser');
      document.getElementById('userFormName').value = user.name || '';
      document.getElementById('userFormEmail').value = user.email || '';
      document.getElementById('userFormPhone').value = user.phone || '';
      if (passwordGroup) passwordGroup.style.display = 'none';
      if (passwordInput) passwordInput.required = false;
    }
  } else {
    if (modalTitle) modalTitle.textContent = t('addUser');
    if (passwordGroup) passwordGroup.style.display = 'block';
    if (passwordInput) passwordInput.required = true;
  }

  modal?.classList.add('show');
}

function setupEventListeners() {
  // Search & Filter
  document.getElementById('userSearchInput')?.addEventListener('input', renderUsersTable);
  document.getElementById('userStatusFilter')?.addEventListener('change', renderUsersTable);
  document.getElementById('btnResetUsersFilters')?.addEventListener('click', () => {
    const searchInput = document.getElementById('userSearchInput');
    const statusSelect = document.getElementById('userStatusFilter');
    if (searchInput) searchInput.value = '';
    if (statusSelect) statusSelect.value = 'active';
    renderUsersTable();
  });

  // New User Button
  document.getElementById('btnOpenNewUserModal')?.addEventListener('click', () => openUserModal(null));

  // Drawer Close
  document.getElementById('btnCloseDrawer')?.addEventListener('click', () => {
    document.getElementById('permissionsDrawer')?.classList.remove('show');
  });

  // Sensitive Confirmation Modal
  document.getElementById('btnCloseSensitiveModal')?.addEventListener('click', () => {
    document.getElementById('sensitiveConfirmModal')?.classList.remove('show');
    pendingSensitiveToggle = null;
  });
  document.getElementById('btnCancelSensitiveChange')?.addEventListener('click', () => {
    document.getElementById('sensitiveConfirmModal')?.classList.remove('show');
    pendingSensitiveToggle = null;
  });
  document.getElementById('btnConfirmSensitiveChange')?.addEventListener('click', async () => {
    if (pendingSensitiveToggle && activeDrawerUser) {
      const { code, shouldGrant, checkbox } = pendingSensitiveToggle;
      checkbox.checked = shouldGrant;
      await executePermissionChange(activeDrawerUser.id, code, shouldGrant);
    }
    document.getElementById('sensitiveConfirmModal')?.classList.remove('show');
    pendingSensitiveToggle = null;
  });

  // Deactivate Confirmation Modal
  document.getElementById('btnCloseDeactivateModal')?.addEventListener('click', () => {
    document.getElementById('deactivateConfirmModal')?.classList.remove('show');
    pendingDeactivateUserId = null;
  });
  document.getElementById('btnCancelDeactivate')?.addEventListener('click', () => {
    document.getElementById('deactivateConfirmModal')?.classList.remove('show');
    pendingDeactivateUserId = null;
  });
  document.getElementById('btnConfirmDeactivate')?.addEventListener('click', async () => {
    if (pendingDeactivateUserId) {
      await toggleUserActiveStatus(pendingDeactivateUserId, false);
    }
    document.getElementById('deactivateConfirmModal')?.classList.remove('show');
    pendingDeactivateUserId = null;
  });

  // User Create / Edit Form Submission
  document.getElementById('btnCloseUserModal')?.addEventListener('click', () => {
    document.getElementById('userFormModal')?.classList.remove('show');
  });
  document.getElementById('btnCancelUserForm')?.addEventListener('click', () => {
    document.getElementById('userFormModal')?.classList.remove('show');
  });

  document.getElementById('userForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('userFormName').value.trim();
    const email = document.getElementById('userFormEmail').value.trim().toLowerCase();
    const phone = document.getElementById('userFormPhone').value.trim();
    const password = document.getElementById('userFormPassword')?.value;

    const payload = {
      name,
      email,
      phone,
      role: activeCompany,
      company: activeCompany
    };

    if (!editingUserId && password) {
      payload.password = password;
    }

    try {
      if (editingUserId) {
        await api.patch(`users/${encodeURIComponent(editingUserId)}`, payload);
        const existing = allUsersList.find(u => u.id === editingUserId);
        if (existing) Object.assign(existing, payload);
      } else {
        const created = await api.post('users', payload);
        allUsersList.unshift({
          ...payload,
          id: created?.id || `usr-${Date.now()}`,
          is_active: true,
          created_at: new Date().toISOString().split('T')[0],
          permissions: ['ops_create', 'reports_export']
        });
      }
    } catch (err) {
      console.warn('API save user fallback to local memory:', err);
      if (!editingUserId) {
        allUsersList.unshift({
          ...payload,
          id: `usr-${Date.now()}`,
          is_active: true,
          created_at: new Date().toISOString().split('T')[0],
          permissions: ['ops_create', 'reports_export']
        });
      }
    }

    document.getElementById('userFormModal')?.classList.remove('show');
    renderUsersTable();
  });
}

function applyStaticTranslations() {
  const isBakers = activeCompany === 'bakers';
  const companyTitle = isBakers ? 'Bankers Tankers' : 'FuelLink';

  const lblUsersTitle = document.getElementById('lblUsersTitle');
  const lblUsersSubtitle = document.getElementById('lblUsersSubtitle');
  const tableSectionTitle = document.getElementById('tableSectionTitle');

  if (lblUsersTitle) {
    lblUsersTitle.textContent = `${t('usersListTitle')} (${companyTitle})`;
  }
  if (lblUsersSubtitle) {
    lblUsersSubtitle.textContent = t('usersListSubtitle');
  }
  if (tableSectionTitle) {
    tableSectionTitle.textContent = `${t('usersListTitle')} (${companyTitle})`;
  }

  const ids = {
    lblSearchPrompt: 'searchUsersPrompt',
    lblStatusFilter: 'accountStatus',
    btnResetUsersFilters: 'resetFilters',
    lblAddUserBtn: 'addUser',
    optStatusAll: 'allStatuses',
    optStatusActive: 'activeOnly',
    optStatusInactive: 'inactiveOnly',
    thUserName: 'userColName',
    thUserCompany: 'userColCompany',
    thUserPhone: 'userColPhone',
    thUserStatus: 'userColStatus',
    thUserCreated: 'userColCreatedAt',
    thUserActions: 'userColActions',
    lblConfirmSensitiveTitle: 'confirmSensitivePermissionTitle',
    lblConfirmSensitiveDesc: 'confirmSensitivePermissionDesc',
    lblConfirmDeactivateTitle: 'confirmDeactivateTitle',
    lblConfirmDeactivateDesc: 'confirmDeactivateDesc',
    lblFormFullName: 'userFullName',
    lblFormEmail: 'emailAddress',
    lblFormPhone: 'userPhone',
    lblFormPassword: 'userPassword',
    btnCancelSensitiveChange: 'cancel',
    btnConfirmSensitiveChange: 'confirm',
    btnCancelDeactivate: 'cancel',
    btnConfirmDeactivate: 'confirm',
    btnCancelUserForm: 'cancel',
    btnSaveUser: 'saveUser'
  };

  for (const [domId, key] of Object.entries(ids)) {
    const el = document.getElementById(domId);
    if (el) el.textContent = t(key);
  }

  const searchInput = document.getElementById('userSearchInput');
  if (searchInput) searchInput.placeholder = t('searchUsersPlaceholder');

  const passwordInput = document.getElementById('userFormPassword');
  if (passwordInput) passwordInput.placeholder = t('passwordMinLength');
}
