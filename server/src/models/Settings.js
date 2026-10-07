import mongoose from 'mongoose';

export const DEFAULT_TERMS = [
  'Only one spin is allowed per mobile number.',
  'The voucher is valid only at Sadguru Selection.',
  'Show your voucher code at the billing counter to redeem it.',
  'Shopping vouchers are valid only on the minimum purchase amount mentioned on the voucher.',
  'Vouchers cannot be exchanged for cash and cannot be combined with any other offer.',
  'Each voucher can be redeemed only once.',
  'Sadguru Selection reserves the right to change or withdraw this offer at any time without prior notice.',
  'In case of any dispute, the decision of Sadguru Selection management will be final.',
].join('\n');

export const DEFAULT_WHATSAPP_MESSAGE = [
  '🎉 {brand} – Spin & Win',
  '',
  '🎁 Reward: {reward}',
  '🎟️ Voucher code: {code}',
  '📱 Mobile: +91 {mobile}',
  '📅 Won on: {date}',
  '',
  'Show this message at the store to redeem your reward.',
].join('\n');

const text = (value) => ({ type: String, default: value, trim: true });
const image = { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null };

// A single document (key "site") holds everything the admin can edit except the rewards
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'site', unique: true },

    brandName: text('Sadguru Selection'),
    headline: text('Scan & Get Your Navratri Gift'),
    subheadline: text('Enter your mobile number, spin the wheel and unlock your festive reward!'),
    spinTitle: text('Spin the Wheel!'),
    spinSubtitle: text('You get one spin per mobile number. Tap SPIN to unlock your gift.'),
    winTitle: text('CONGRATULATIONS!'),
    winSubtitle: text('You have unlocked'),
    claimButtonText: text('Get my voucher on WhatsApp'),
    claimNote: text('Show this voucher code at the store to redeem your reward.'),
    termsTitle: text('Terms & Conditions'),
    terms: text(DEFAULT_TERMS),

    campaignActive: { type: Boolean, default: true },
    closedMessage: text('This offer has ended. Thank you for visiting!'),

    // "self": the voucher is sent to the user's own WhatsApp. "business": to businessWhatsapp.
    claimTarget: { type: String, enum: ['self', 'business'], default: 'self' },
    businessWhatsapp: text(''),
    whatsappMessage: text(DEFAULT_WHATSAPP_MESSAGE),

    couponPrefix: text('SS'),

    desktopBg: image,
    mobileBg: image,
    logo: image,
    // Darkness of the layer over the background image, in percent
    bgOverlay: { type: Number, default: 45, min: 0, max: 90 },
  },
  { timestamps: true }
);

export default mongoose.model('Settings', settingsSchema);
