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
  fuellink: 'shads@fuelink.co.za',
  bakers: 'shads@bakers.co.za'
};

// Local test mock accounts
const LOCAL_MOCK_USERS = {
  'shads@fuelink.co.za': {
    password: '12345678',
    role: 'fuellink',
    id: 'mock-user-fl-01'
  },
  'shads@bakers.co.za': {
    password: '12345678',
    role: 'bakers',
    id: 'mock-user-bt-02'
  }
};

/**
 * Sign in using email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: object, role: string}>}
 */
export async function signIn(email, password) {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Check if local test mock account matches
  if (LOCAL_MOCK_USERS[cleanEmail]) {
    const mock = LOCAL_MOCK_USERS[cleanEmail];
    if (mock.password === password) {
      const mockSession = {
        user: { id: mock.id, email: cleanEmail },
        role: mock.role,
        isMock: true
      };
      localStorage.setItem('fuellink_local_session', JSON.stringify(mockSession));
      return { user: mockSession.user, role: mock.role };
    } else {
      throw new Error('Palavra-passe incorreta para conta de teste.');
    }
  }

  // 2. Fallback to Supabase if connected
  if (sb) {
    const { data, error } = await sb.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });

    if (error) throw error;

    const role = await fetchUserRole(data.user.id);
    return { user: data.user, role };
  }

  throw new Error('Credenciais inválidas.');
}

/**
 * Fetch role for a specific user ID
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
 * Get current session and role if signed in
 * @returns {Promise<{session: object, role: string}|null>}
 */
export async function getSession() {
  // Check local mock session first
  const localSaved = localStorage.getItem('fuellink_local_session');
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      if (parsed && parsed.user && parsed.role) {
        return { session: { user: parsed.user }, role: parsed.role };
      }
    } catch (e) {
      console.warn('Local session parse error:', e);
    }
  }

  if (!sb) return null;

  const { data: { session }, error } = await sb.auth.getSession();
  if (error || !session) return null;

  try {
    const role = await fetchUserRole(session.user.id);
    return { session, role };
  } catch (err) {
    console.warn('Session found but role lookup failed:', err);
    return { session, role: null };
  }
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
