// Browser-only implementation of the Spin & Win backend.
// Every function is async and mirrors an API endpoint, so moving to a real
// server later only means replacing the bodies here with fetch() calls:
//   sendOtp   -> POST /api/auth/send-otp
//   verifyOtp -> POST /api/auth/verify-otp
//   getMyWins   -> GET    /api/spins/me
//   spinWheel   -> POST   /api/spin
//   markClaimed -> POST   /api/spins/:id/claim
//   resetWins   -> DELETE /api/spins/me

import { OTP_RESEND_SECONDS, OTP_TTL_SECONDS, REWARDS } from '../config.js';

const SESSION_KEY = 'spinwin_session';
const WINS_KEY = 'spinwin_wins';
const MOBILE_REGEX = /^\d{10}$/;
const MAX_OTP_ATTEMPTS = 5;

export class ServiceError extends Error {
  constructor(message, code, data = {}) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

function readJSON(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode); state just won't survive a reload
  }
}

function randomInt(max) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

function pickWeighted(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = (randomInt(1_000_000) / 1_000_000) * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

const COUPON_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCouponCode() {
  let code = '';
  for (let i = 0; i < 8; i++) code += COUPON_CHARS[randomInt(COUPON_CHARS.length)];
  return `SPIN-${code}`;
}

// ─── Session ────────────────────────────────────────────────────────

export function loadSession() {
  return readJSON(localStorage, SESSION_KEY, null);
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

// ─── Auth ───────────────────────────────────────────────────────────

let pendingOtp = null; // { mobile, code, expiresAt, sentAt, attempts }

export function isValidMobile(mobile) {
  return MOBILE_REGEX.test(mobile);
}

export async function sendOtp(mobile) {
  if (!isValidMobile(mobile)) throw new ServiceError('Enter a valid 10-digit mobile number', 'INVALID_MOBILE');

  if (pendingOtp?.mobile === mobile) {
    const elapsed = (Date.now() - pendingOtp.sentAt) / 1000;
    if (elapsed < OTP_RESEND_SECONDS) {
      const retryAfter = Math.ceil(OTP_RESEND_SECONDS - elapsed);
      throw new ServiceError(`Please wait ${retryAfter}s before requesting a new OTP`, 'RATE_LIMIT', { retryAfter });
    }
  }

  const code = randomInt(1_000_000).toString().padStart(6, '0');
  pendingOtp = { mobile, code, sentAt: Date.now(), expiresAt: Date.now() + OTP_TTL_SECONDS * 1000, attempts: 0 };

  // No SMS gateway yet, so the OTP is returned and shown on screen
  return { otp: code, resendIn: OTP_RESEND_SECONDS, expiresIn: OTP_TTL_SECONDS };
}

export async function verifyOtp(mobile, otp) {
  if (!/^\d{6}$/.test(otp)) throw new ServiceError('Enter the 6-digit OTP', 'INVALID_OTP');
  if (!pendingOtp || pendingOtp.mobile !== mobile || pendingOtp.expiresAt < Date.now()) {
    throw new ServiceError('OTP expired, please request a new one', 'OTP_EXPIRED');
  }

  if (pendingOtp.code !== otp) {
    pendingOtp.attempts += 1;
    if (pendingOtp.attempts >= MAX_OTP_ATTEMPTS) {
      pendingOtp = null;
      throw new ServiceError('Too many wrong attempts, please request a new OTP', 'OTP_LOCKED');
    }
    const left = MAX_OTP_ATTEMPTS - pendingOtp.attempts;
    throw new ServiceError(`Incorrect OTP, ${left} attempt${left === 1 ? '' : 's'} left`, 'INVALID_OTP');
  }

  pendingOtp = null;
  const session = { user: { mobile }, loggedInAt: new Date().toISOString() };
  writeJSON(localStorage, SESSION_KEY, session);
  return session;
}

// ─── Spin ───────────────────────────────────────────────────────────

function withIndex(spin) {
  return { ...spin, rewardIndex: REWARDS.findIndex((r) => r.id === spin.rewardId) };
}

export async function getRewards() {
  return REWARDS.map(({ weight, ...reward }) => reward);
}

function readWins(mobile) {
  const all = readJSON(localStorage, WINS_KEY, {});
  const wins = all[mobile];
  // Older builds stored a single win object per mobile
  return { all, wins: Array.isArray(wins) ? wins : wins ? [wins] : [] };
}

// All wins for this mobile, newest first
export async function getMyWins(mobile) {
  return readWins(mobile).wins.map(withIndex);
}

export async function spinWheel(mobile) {
  const reward = pickWeighted(REWARDS.filter((r) => r.weight > 0));
  const spin = {
    id: crypto.randomUUID?.() ?? String(Date.now()),
    rewardId: reward.id,
    label: reward.label,
    description: reward.description,
    icon: reward.icon,
    isWin: reward.isWin,
    couponCode: reward.isWin ? generateCouponCode() : null,
    wonAt: new Date().toISOString(),
    claimedAt: null,
  };

  if (spin.isWin) {
    const { all, wins } = readWins(mobile);
    all[mobile] = [spin, ...wins];
    writeJSON(localStorage, WINS_KEY, all);
  }
  return withIndex(spin);
}

export async function markClaimed(mobile, spinId) {
  const { all, wins } = readWins(mobile);
  const win = wins.find((w) => w.id === spinId);
  if (win && !win.claimedAt) {
    win.claimedAt = new Date().toISOString();
    all[mobile] = wins;
    writeJSON(localStorage, WINS_KEY, all);
  }
  return wins.map(withIndex);
}

export async function resetWins(mobile) {
  const { all } = readWins(mobile);
  delete all[mobile];
  writeJSON(localStorage, WINS_KEY, all);
}
