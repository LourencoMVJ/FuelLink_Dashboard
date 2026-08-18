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
  fuellink: 'info@fuelink.co.za',
  bakers: 'waseem@bakers.co.za'
};

/**
 * Sign in using email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: object, role: string}>}
 */
export async function signIn(email, password) {
  if (!sb) throw new Error('Supabase client is not available.');

  const { data, error } = await sb.auth.signInWithPassword({
    email: email.trim(),
    password: password
  });

  if (error) {
    throw error;
  }

  const role = await fetchUserRole(data.user.id);
  return { user: data.user, role };
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
  if (!sb) return;
  await sb.auth.signOut();
}
