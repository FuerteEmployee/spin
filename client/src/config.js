// ─── Edit these values before building ─────────────────────────────

export const BRAND_NAME = 'Spin & Win';

// Number that receives reward claims: country code + number, no "+" or spaces
export const WHATSAPP_NUMBER = '917990486477';

// Seconds before the user can request another OTP
export const OTP_RESEND_SECONDS = 30;
export const OTP_TTL_SECONDS = 300;

// Wheel segments, clockwise from the top.
// weight = relative chance of landing on it (doesn't need to add up to 100).
// isWin: false = no coupon, the user can spin again.
// wheelLabel: "\n" splits the text onto two lines on the wheel.
export const REWARDS = [
  { id: 'off5', label: '5% Off', wheelLabel: '5%\nOFF', icon: '🏷️', description: 'Get 5% off on your purchase.', color: '#7c3aed', textColor: '#ffffff', weight: 30, isWin: true },
  { id: 'off10', label: '10% Off', wheelLabel: '10%\nOFF', icon: '💸', description: 'Get 10% off on your purchase.', color: '#f59e0b', textColor: '#3b0764', weight: 22, isWin: true },
  { id: 'off15', label: '15% Off', wheelLabel: '15%\nOFF', icon: '🔥', description: 'Get 15% off on your purchase.', color: '#ec4899', textColor: '#ffffff', weight: 12, isWin: true },
  { id: 'retry', label: 'Try Again', wheelLabel: 'TRY\nAGAIN', icon: '🔄', description: 'So close! Give it another spin.', color: '#334155', textColor: '#ffffff', weight: 33, isWin: false },
  { id: 'free1m', label: 'Get 1 Month Free', wheelLabel: '1 MONTH\nFREE', icon: '🎉', description: 'Enjoy 1 month of service absolutely free.', color: '#10b981', textColor: '#ffffff', weight: 2.5, isWin: true },
  { id: 'free6m', label: 'Get 6 Months Free', wheelLabel: '6 MONTHS\nFREE', icon: '👑', description: 'Jackpot! Enjoy 6 months of service absolutely free.', color: '#ef4444', textColor: '#ffffff', weight: 0.5, isWin: true },
];
