import config from '../config/index.js';
import Reward from '../models/Reward.js';
import Settings from '../models/Settings.js';

export const IMAGE_SLOTS = ['desktopBg', 'mobileBg', 'logo'];

// Editable text fields and their maximum lengths
export const TEXT_FIELDS = {
  brandName: 60,
  headline: 100,
  subheadline: 240,
  spinTitle: 80,
  spinSubtitle: 240,
  winTitle: 60,
  winSubtitle: 100,
  claimButtonText: 40,
  claimNote: 240,
  termsTitle: 60,
  terms: 5000,
  closedMessage: 240,
  whatsappMessage: 1000,
};
export const REQUIRED_TEXT_FIELDS = ['brandName', 'headline', 'winTitle', 'claimButtonText'];

export function getSettings() {
  return Settings.findOneAndUpdate(
    { key: 'site' },
    { $setOnInsert: { key: 'site' } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
}

export function getActiveRewards() {
  return Reward.find({ active: true }).sort({ order: 1, _id: 1 });
}

// Absolute when PUBLIC_URL is set, because the site may be served from another domain
export function imageUrl(id) {
  return id ? `${config.publicUrl}/api/media/${id}` : null;
}

// What the public site needs. Reward weights stay on the server.
export function publicSettings(settings) {
  const result = {};
  for (const field of Object.keys(TEXT_FIELDS)) result[field] = settings[field];
  return {
    ...result,
    campaignActive: settings.campaignActive,
    otpMode: config.otpMode,
    claimTarget: settings.claimTarget,
    businessWhatsapp: settings.businessWhatsapp,
    bgOverlay: settings.bgOverlay,
    images: Object.fromEntries(IMAGE_SLOTS.map((slot) => [slot, imageUrl(settings[slot])])),
  };
}

export function adminSettings(settings) {
  return { ...publicSettings(settings), couponPrefix: settings.couponPrefix };
}

export function publicReward(r) {
  return {
    id: r.id,
    label: r.label,
    wheelLabel: r.wheelLabel,
    description: r.description,
    icon: r.icon,
    color: r.color,
    textColor: r.textColor,
    isWin: r.isWin,
    showNote: r.showNote,
  };
}

export function adminReward(r) {
  return { ...publicReward(r), weight: r.weight };
}
