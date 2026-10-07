import Reward from './models/Reward.js';

// Order here is the clockwise order on the wheel
export const DEFAULT_REWARDS = [
  { label: '5% Off', wheelLabel: '5%\nOFF', icon: '🏷️', description: 'Get 5% off on your purchase.', color: '#7c3aed', weight: 30 },
  { label: '10% Off', wheelLabel: '10%\nOFF', icon: '💸', description: 'Get 10% off on your purchase.', color: '#f59e0b', textColor: '#3b0764', weight: 22 },
  { label: '15% Off', wheelLabel: '15%\nOFF', icon: '🔥', description: 'Get 15% off on your purchase.', color: '#ec4899', weight: 12 },
  { label: 'Try Again', wheelLabel: 'TRY\nAGAIN', icon: '🔄', description: 'So close! Spin once more.', color: '#334155', weight: 33, isWin: false },
  { label: 'Get 1 Month Free', wheelLabel: '1 MONTH\nFREE', icon: '🎉', description: 'Enjoy 1 month of service absolutely free.', color: '#10b981', weight: 2.5 },
  { label: 'Get 6 Months Free', wheelLabel: '6 MONTHS\nFREE', icon: '👑', description: 'Jackpot! Enjoy 6 months of service absolutely free.', color: '#ef4444', weight: 0.5 },
];

export async function seedRewards() {
  const count = await Reward.countDocuments();
  if (count > 0) return;
  await Reward.insertMany(DEFAULT_REWARDS.map((reward, order) => ({ ...reward, order })));
  console.log(`Seeded ${DEFAULT_REWARDS.length} rewards`);
}
