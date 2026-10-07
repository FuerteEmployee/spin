import mongoose from 'mongoose';

const spinSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mobile: { type: String, required: true },
    reward: { type: mongoose.Schema.Types.ObjectId, ref: 'Reward', required: true },
    // Snapshot so past wins stay intact if a reward is edited later
    rewardLabel: { type: String, required: true },
    rewardDescription: { type: String, default: '' },
    rewardIcon: { type: String, default: '🎁' },
    isWin: { type: Boolean, required: true },
    couponCode: { type: String },
    claimedAt: { type: Date },
  },
  { timestamps: true }
);

// One winning spin per user, enforced by the database (safe against double-clicks / races)
spinSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { isWin: true } });
spinSchema.index({ couponCode: 1 }, { unique: true, partialFilterExpression: { isWin: true } });

export default mongoose.model('Spin', spinSchema);
