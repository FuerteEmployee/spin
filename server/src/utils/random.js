import crypto from 'node:crypto';

export function generateOtp() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashOtp(mobile, otp) {
  return crypto.createHash('sha256').update(`${mobile}:${otp}`).digest('hex');
}

export function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

const COUPON_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCouponCode() {
  let code = '';
  for (let i = 0; i < 8; i++) code += COUPON_CHARS[crypto.randomInt(COUPON_CHARS.length)];
  return `SPIN-${code}`;
}

// Picks an item with probability proportional to its weight
export function pickWeighted(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = crypto.randomInt(0, 1_000_000) / 1_000_000 * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}
