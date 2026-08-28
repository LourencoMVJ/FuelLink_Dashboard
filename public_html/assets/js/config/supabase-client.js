/**
 * Supabase Client Configuration
 * Single source of truth for the Supabase instance in the frontend.
 */
const SUPABASE_URL = 'https://vyhjninisvdlgbivwxuw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_p2ne0Zq_u8fYhbTynOOt6g_Z_Dq7qon';

// Ensure the Supabase JS library is loaded globally
if (typeof supabase === 'undefined') {
  console.error('Supabase library is not loaded. Please include the Supabase JS script before this file.');
}

export const sb = typeof supabase !== 'undefined' 
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
