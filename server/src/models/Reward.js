import mongoose from 'mongoose';

const rewardSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    // Wheel text; "\n" splits it onto two lines
    wheelLabel: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '🎁' },
    color: { type: String, required: true },
    textColor: { type: String, default: '#ffffff' },
    // Relative chance of landing on this segment
    weight: { type: Number, required: true, min: 0 },
    // false for "Try Again" style segments: no coupon, user may spin again
    isWin: { type: Boolean, default: true },
    // Show the description (e.g. a minimum-purchase condition) under the spin button
    showNote: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Reward', rewardSchema);
