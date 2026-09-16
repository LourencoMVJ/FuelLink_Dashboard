/**
 * Auth Service Module (Frontend Core)
 * Handles authentication lifecycle, session recovery, and role resolution.
 */
import { sb } from '../config/supabase-client.js';

export const ROLE_LABELS = {
  bakers: 'Bakers Tankers (Pty) Ltd',
  fuellink: 'FuelLink / Rwendo Services'
};

export const ROLE_PRESETS = {
  fuellink: 'admin@fuelink.co.za',
  bakers: 'admin@bakers.co.za'
};

// Local test mock accounts (Admins + 3 Users per company)
const LOCAL_MOCK_USERS = {
  // FuelLink Admin
  'admin@fuelink.co.za': {
    password: '12345678',
    role: 'fuellink',
    id: 'mock-user-fl-admin',
    name: 'FuelLink Administrator',
    is_admin: true,
    permissions: ['ops_create', 'ops_edit', 'ops_void', 'reports_export', 'prices_edit', 'users_manage', 'financial_view', 'cross_ledger_view']
  },
  // FuelLink Users
  'carlos.mendes@fuelink.co.za': {
    password: '12345678',
    role: 'fuellink',
    id: 'mock-user-fl-01',
    name: 'Carlos Mendes',
    is_admin: false,
    permissions: ['ops_create', 'ops_edit', 'reports_export']
  },
  'johan.merwe@fuelink.co.za': {
    password: '12345678',
    role: 'fuellink',
    id: 'mock-user-fl-02',
    name: 'Johan Van Der Merwe',
    is_admin: false,
    permissions: ['ops_create', 'reports_export']
  },
  'sarah.jenkins@fuelink.co.za': {
    password: '12345678',
    role: 'fuellink',
    id: 'mock-user-fl-03',
    name: 'Sarah Jenkins',
    is_admin: false,
    permissions: ['ops_create', 'ops_edit']
  },

  // Bankers Tankers Admin
  'admin@bakers.co.za': {
    password: '12345678',
    role: 'bakers',
    id: 'mock-user-bt-admin',
    name: 'Bankers Administrator',
    is_admin: true,
    permissions: ['ops_create', 'ops_edit', 'ops_void', 'reports_export', 'prices_edit', 'users_manage', 'financial_view', 'cross_ledger_view']
  },
  // Bankers Tankers Users
  'sipho.zulu@bakers.co.za': {
    password: '12345678',
    role: 'bakers',
    id: 'mock-user-bt-01',
    name: 'Sipho Zulu',
    is_admin: false,
    permissions: ['ops_create', 'ops_edit', 'reports_export']
  },
  'thabo.molefe@bakers.co.za': {
    password: '12345678',
    role: 'bakers',
    id: 'mock-user-bt-02',
    name: 'Thabo Molefe',
    is_admin: false,
    permissions: ['ops_create', 'reports_export']
  },
  'elena.rossi@bakers.co.za': {
    password: '12345678',
    role: 'bakers',
    id: 'mock-user-bt-03',
    name: 'Elena Rossi',
    is_admin: false,
    permissions: ['ops_create', 'ops_edit']
  },

  // Backward compatibility alias for shads
  'shads@fuelink.co.za': {
    password: '12345678',
    role: 'fuellink',
    id: 'mock-user-fl-shads',
    name: 'Shads (FuelLink)',
    is_admin: true,
    permissions: ['ops_create', 'ops_edit', 'ops_void', 'reports_export', 'prices_edit', 'users_manage', 'financial_view', 'cross_ledger_view']
  },
  'shads@bakers.co.za': {
    password: '12345678',
    role: 'bakers',
    id: 'mock-user-bt-shads',
    name: 'Shads (Bankers)',
    is_admin: true,
    permissions: ['ops_create', 'ops_edit', 'ops_void', 'reports_export', 'prices_edit', 'users_manage', 'financial_view', 'cross_ledger_view']
  }
};

/**
 * Sign in using email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: object, role: string, isAdmin: boolean}>}
 */
export async function signIn(email, password) {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Check if local test mock account matches
  if (LOCAL_MOCK_USERS[cleanEmail]) {
    const mock = LOCAL_MOCK_USERS[cleanEmail];
    if (mock.password === password) {
      const mockSession = {
        user: { id: mock.id, email: cleanEmail, name: mock.name },
        role: mock.role,
        isAdmin: Boolean(mock.is_admin),
        permissions: mock.permissions || [],
        isMock: true
      };
      localStorage.setItem('fuellink_local_session', JSON.stringify(mockSession));
      return { user: mockSession.user, role: mock.role, isAdmin: mockSession.isAdmin };
    } else {
      throw new Error('WRONG_TEST_PASSWORD');
    }
  }

  // 2. Fallback to Supabase if connected
  if (sb) {
    const { data, error } = await sb.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });

    if (error) throw error;

    try {
      const profile = await fetchProfile(data.session.access_token);
      return { user: data.user, role: profile.role, isAdmin: Boolean(profile.is_admin) };
    } catch (e) {
      // Fallback if backend API is not responding or role is direct
      const role = await fetchUserRole(data.user.id);
      return { user: data.user, role, isAdmin: false };
    }
  }

  throw new Error('Credenciais inválidas.');
}

/**
 * Fetch role directly for a specific user ID via Supabase fallback
 * @param {string} userId
 * @returns {Promise<string>}
 */
export async function fetchUserRole(userId) {
  if (!sb) return null;

  const { data, error } = await sb
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('Conta sem perfil/empresa atribuída no sistema. Contacte o administrador.');
  }

  return data.role;
}

/**
 * Fetch the caller's app-level profile (role, permissions, is_admin) via
 * GET /api/me — the PHP endpoint that joins user_roles + user_permissions.
 * @param {string} accessToken
 * @returns {Promise<object>}
 */
export async function fetchProfile(accessToken) {
  const res = await fetch('../api/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (res.status === 401) {
    const err = new Error('SESSION_EXPIRED');
    err.status = 401;
    throw err;
  }

  let envelope = null;
  try {
    envelope = await res.json();
  } catch {
    // No JSON body — envelope stays null, handled below.
  }

  if (!envelope || !envelope.success) {
    throw new Error(envelope?.error || 'Conta sem perfil/empresa atribuída no sistema. Contacte o administrador.');
  }

  return envelope.data;
}

/**
 * Validates the active user session against the backend immediately.
 * If the session is expired or revoked (401), triggers the global session expired modal and returns null.
 * Also handles mock test sessions gracefully.
 * @param {boolean} [showModalOnExpire=true]
 * @returns {Promise<{session: object, role: string, isAdmin: boolean, permissions: string[]}|null>}
 */
export async function validateSessionOrBlock(showModalOnExpire = true) {
  // Check local mock test accounts first
  const localSaved = localStorage.getItem('fuellink_local_session');
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      if (parsed && parsed.user && parsed.role) {
        return {
          session: { user: parsed.user },
          role: parsed.role,
          isAdmin: Boolean(parsed.isAdmin),
          permissions: parsed.permissions || []
        };
      }
    } catch (e) {
      console.warn('Local session parse error:', e);
    }
  }

  // Supabase live session validation
  if (!sb) {
    return null;
  }

  const { data: { session }, error } = await sb.auth.getSession();
  if (error || !session) {
    return null;
  }

  try {
    const profile = await fetchProfile(session.access_token);
    return {
      session,
      role: profile.role,
      isAdmin: Boolean(profile.is_admin),
      permissions: profile.permissions || []
    };
  } catch (err) {
    if (err.status === 401 || err.message === 'SESSION_EXPIRED') {
      console.warn('Session expired on backend validation (401). Triggering session expired modal.');
      if (showModalOnExpire) {
        // Dynamically import sidebar's showSessionExpiredModal to avoid circular dependencies
        import('./sidebar.js').then(module => {
          module.showSessionExpiredModal();
        }).catch(() => {});
      }
      return null;
    }
    
    // Fallback if backend /api/me is unreachable or non-401 error
    console.warn('Backend profile verification returned error, falling back to role query:', err);
    try {
      const role = await fetchUserRole(session.user.id);
      return { session, role, isAdmin: false, permissions: [] };
    } catch (e2) {
      return { session, role: null, isAdmin: false, permissions: [] };
    }
  }
}

/**
 * Sets up global event listeners for window focus and tab visibility changes
 * to immediately re-verify backend session validity when the user returns to the tab.
 */
export function setupSessionExpiryWatcher() {
  if (window.__sessionWatcherInitialized) return;
  window.__sessionWatcherInitialized = true;

  let isChecking = false;
  const checkSession = async () => {
    // Only check if user has an active session
    const hasLocalSession = !!localStorage.getItem('fuellink_local_session');
    if (hasLocalSession) return; // Local mock test sessions don't expire on backend

    if (isChecking) return;
    isChecking = true;
    try {
      if (sb) {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
          await fetchProfile(session.access_token);
        }
      }
    } catch (err) {
      if (err.status === 401 || err.message === 'SESSION_EXPIRED') {
        import('./sidebar.js').then(module => {
          module.showSessionExpiredModal();
        }).catch(() => {});
      }
    } finally {
      isChecking = false;
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkSession();
    }
  });

  window.addEventListener('focus', () => {
    checkSession();
  });
}

// Automatically start the session watcher
setupSessionExpiryWatcher();

/**
 * Get current session and role if signed in
 * @returns {Promise<{session: object, role: string, isAdmin: boolean}|null>}
 */
export async function getSession() {
  return validateSessionOrBlock(true);
}

/**
 * Sign out current user
 */
export async function signOut() {
  localStorage.removeItem('fuellink_local_session');
  if (sb) {
    await sb.auth.signOut();
  }
}


