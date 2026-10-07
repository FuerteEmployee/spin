// Public site API (server/src/routes/site.js, auth.js, spin.js)
import { request, ServiceError } from './api.js';

export { ServiceError };

const SESSION_KEY = 'spinwin_session';
const MOBILE_REGEX = /^\d{10}$/;

// ─── Session ────────────────────────────────────────────────────────

export function loadSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    // Sessions from the old browser-only build have no token
    return session?.token ? session : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage unavailable (private mode); the user just logs in again after a reload
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

const token = () => loadSession()?.token;

// ─── Site ───────────────────────────────────────────────────────────

// Texts, T&C, images and wheel segments, all managed in the admin panel
export function getSite() {
  return request('/site');
}

// ─── Auth ───────────────────────────────────────────────────────────

export function isValidMobile(mobile) {
  return MOBILE_REGEX.test(mobile);
}

// Returns { otp?, resendIn, expiresIn }. otp is only present while SHOW_OTP_ON_SCREEN is on.
export function sendOtp(mobile) {
  return request('/auth/send-otp', { method: 'POST', body: { mobile } });
}

export async function verifyOtp(mobile, otp) {
  const data = await request('/auth/verify-otp', { method: 'POST', body: { mobile, otp } });
  const session = { token: data.token, user: data.user };
  saveSession(session);
  return session;
}

// Exchanges a Firebase phone-auth ID token (see firebase.js) for an app session
export async function loginWithFirebase(idToken) {
  const data = await request('/auth/firebase', { method: 'POST', body: { idToken } });
  const session = { token: data.token, user: data.user };
  saveSession(session);
  return session;
}

// ─── Spin ───────────────────────────────────────────────────────────

// The user's winning spin, or null if they haven't won yet
export async function getMyWin() {
  return (await request('/spin/me', { token: token() })).spin;
}

// Throws ServiceError ALREADY_WON (with data.spin) or CAMPAIGN_CLOSED
export async function spinWheel() {
  return (await request('/spin', { method: 'POST', token: token() })).spin;
}

export async function markClaimed() {
  return (await request('/spin/claim', { method: 'POST', token: token() })).claimedAt;
}
