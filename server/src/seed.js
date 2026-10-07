import Reward from './models/Reward.js';
import { getSettings } from './services/site.js';

// Order here is the clockwise order on the wheel. Only used when the rewards collection is empty;
// after that, rewards are managed in the admin panel.
export const DEFAULT_REWARDS = [
  { label: '10% OFF', wheelLabel: '10%\nOFF', icon: '🏷️', description: 'Get 10% off on your purchase.', color: '#7c3aed', weight: 30 },
  { label: '15% OFF', wheelLabel: '15%\nOFF', icon: '✨', description: 'Get 15% off on your purchase.', color: '#ec4899', weight: 8 },
  { label: '₹2,000 Shopping Voucher', wheelLabel: '₹2000\nVOUCHER', icon: '💎', description: 'Valid on a minimum purchase of ₹10,000.', color: '#ef4444', weight: 7, showNote: true },
  { label: '10% OFF', wheelLabel: '10%\nOFF', icon: '🏷️', description: 'Get 10% off on your purchase.', color: '#0ea5e9', weight: 30 },
  { label: '₹1,000 Shopping Voucher', wheelLabel: '₹1000\nVOUCHER', icon: '🛍️', description: 'Valid on a minimum purchase of ₹5,000.', color: '#f59e0b', textColor: '#3b0764', weight: 15, showNote: true },
  { label: 'Festive Gift', wheelLabel: 'FESTIVE\nGIFT', icon: '🎁', description: 'Collect your festive gift from our store.', color: '#10b981', weight: 10 },
];

export async function seed() {
  await getSettings();
  const count = await Reward.countDocuments();
  if (count > 0) return;
  await Reward.insertMany(DEFAULT_REWARDS.map((reward, order) => ({ ...reward, order })));
  console.log(`Seeded ${DEFAULT_REWARDS.length} rewards`);
}
