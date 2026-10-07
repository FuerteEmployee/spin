// Admin panel API (server/src/routes/admin.js)
import { request } from './api.js';

const TOKEN_KEY = 'spinwin_admin';

export function loadAdminToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearAdminToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export async function adminLogin(username, password) {
  const { token } = await request('/admin/login', { method: 'POST', body: { username, password } });
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
  return token;
}

export const ADMIN_LOGOUT_EVENT = 'spinwin:admin-logout';

// An expired or invalid token logs the admin out everywhere in the panel
async function call(path, options = {}) {
  try {
    return await request(`/admin${path}`, { ...options, token: loadAdminToken() });
  } catch (err) {
    if (err.code === 'UNAUTHORIZED') {
      clearAdminToken();
      window.dispatchEvent(new Event(ADMIN_LOGOUT_EVENT));
    }
    throw err;
  }
}

export const getStats = () => call('/stats');

export const getSettings = () => call('/settings');
export const saveSettings = (settings) => call('/settings', { method: 'PUT', body: settings });
export const uploadImage = (slot, blob) => call(`/images/${slot}`, { method: 'POST', body: blob });
export const removeImage = (slot) => call(`/images/${slot}`, { method: 'DELETE' });

export const getRewards = () => call('/rewards');
export const saveRewards = (rewards) => call('/rewards', { method: 'PUT', body: { rewards } });

export const getParticipants = ({ q = '', filter = 'all', page = 1 }) =>
  call(`/participants?${new URLSearchParams({ q, filter, page })}`);
export const setRedeemed = (spinId, redeemed) => call(`/spins/${spinId}`, { method: 'PATCH', body: { redeemed } });
export const allowRespin = (userId) => call(`/participants/${userId}/spins`, { method: 'DELETE' });

export async function downloadParticipantsCsv({ q = '', filter = 'all' }) {
  const res = await call(`/export.csv?${new URLSearchParams({ q, filter })}`, { raw: true });
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `spin-participants-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
