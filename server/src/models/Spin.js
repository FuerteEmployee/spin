import mongoose from 'mongoose';

const spinSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mobile: { type: String, required: true },
    reward: { type: mongoose.Schema.Types.ObjectId, ref: 'Reward', required: true },
    // Snapshot so past wins stay intact if a reward is edited or deleted later
    rewardLabel: { type: String, required: true },
    rewardDescription: { type: String, default: '' },
    rewardIcon: { type: String, default: '🎁' },
    isWin: { type: Boolean, required: true },
    couponCode: { type: String },
    // User tapped the WhatsApp button
    claimedAt: { type: Date },
    // Staff marked the voucher as used in the admin panel
    redeemedAt: { type: Date },
  },
  { timestamps: true }
);

// One winning spin per user, enforced by the database (safe against double-clicks / races)
spinSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { isWin: true } });
spinSchema.index({ couponCode: 1 }, { unique: true, partialFilterExpression: { isWin: true } });
spinSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Spin', spinSchema);
