/**
 * PHP API Client (Frontend Core)
 * Thin fetch wrapper for /api/* endpoints — attaches the Supabase bearer
 * token, unwraps the {success,data,error,meta} envelope, and throws on
 * failure so callers can just try/catch.
 */
import { sb } from '../config/supabase-client.js';

const API_BASE = '../api';

/**
 * Reads the access token straight from the local Supabase session
 * (network-free except on token-expiry refresh) instead of going through
 * auth.js's getSession(), which always also fetches the full app profile
 * via /api/me — a redundant round-trip when all this needs is the token.
 */
async function getAccessToken() {
  if (!sb) return null;
  const { data, error } = await sb.auth.getSession();
  if (error || !data.session) return null;
  return data.session.access_token || null;
}

async function request(path, { method = 'GET', body, isFormData = false } = {}) {
  const token = await getAccessToken();
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let requestBody;
  if (isFormData) {
    requestBody = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}/${path}`, { method, headers, body: requestBody });

  let envelope = null;
  try {
    envelope = await res.json();
  } catch {
    // No JSON body (e.g. network failure) — envelope stays null, handled below.
  }

  if (!envelope || envelope.success !== true) {
    throw new Error(envelope?.error || `Erro ${res.status} ao comunicar com o servidor.`);
  }

  return envelope.data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData, isFormData: true }),
};

/** Streams a raw file response (proof downloads) — not the JSON envelope. */
export async function downloadFile(path) {
  const token = await getAccessToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/${path}`, { headers });

  if (!res.ok) {
    let message = `Erro ${res.status} ao transferir o ficheiro.`;
    try {
      const envelope = await res.json();
      if (envelope?.error) message = envelope.error;
    } catch {
      // Not JSON (raw file endpoint on success) — keep the generic message.
    }
    throw new Error(message);
  }

  return res.blob();
}
