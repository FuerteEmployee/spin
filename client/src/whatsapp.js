import { BRAND_NAME, WHATSAPP_NUMBER } from './config.js';

export function buildWhatsAppLink(mobile, spin) {
  const wonOn = new Date(spin.wonAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const message = [
    `Hi! 🎉 I just won a reward on ${BRAND_NAME}.`,
    '',
    `🎁 Reward: ${spin.label}`,
    `🎟️ Coupon Code: ${spin.couponCode}`,
    `📱 Mobile: +91 ${mobile}`,
    `📅 Won on: ${wonOn}`,
    '',
    'Please help me claim my reward.',
  ].join('\n');

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
