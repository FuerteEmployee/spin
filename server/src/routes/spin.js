import { Router } from 'express';
import Reward from '../models/Reward.js';
import Spin from '../models/Spin.js';
import { requireAuth } from '../middleware/auth.js';
import { generateCouponCode, pickWeighted } from '../utils/random.js';

const router = Router();

function getActiveRewards() {
  return Reward.find({ active: true }).sort({ order: 1, _id: 1 });
}

function serializeSpin(spin, rewards) {
  return {
    id: spin.id,
    rewardId: spin.reward.toString(),
    rewardIndex: rewards.findIndex((r) => r.id === spin.reward.toString()),
    label: spin.rewardLabel,
    description: spin.rewardDescription,
    icon: spin.rewardIcon,
    isWin: spin.isWin,
    couponCode: spin.couponCode || null,
    wonAt: spin.createdAt,
    claimedAt: spin.claimedAt || null,
  };
}

function alreadyWon(res, win, rewards) {
  return res.status(409).json({ message: 'You have already won a reward', spin: serializeSpin(win, rewards) });
}

// Wheel segments (weights stay on the server)
router.get('/rewards', async (req, res, next) => {
  try {
    const rewards = await getActiveRewards();
    res.json(
      rewards.map((r) => ({
        id: r.id,
        label: r.label,
        wheelLabel: r.wheelLabel,
        icon: r.icon,
        color: r.color,
        textColor: r.textColor,
        isWin: r.isWin,
      }))
    );
  } catch (err) {
    next(err);
  }
});

// The user's winning spin, if they already have one
router.get('/spin/me', requireAuth, async (req, res, next) => {
  try {
    const [win, rewards] = await Promise.all([
      Spin.findOne({ user: req.user.id, isWin: true }),
      getActiveRewards(),
    ]);
    res.json({ spin: win ? serializeSpin(win, rewards) : null });
  } catch (err) {
    next(err);
  }
});

router.post('/spin', requireAuth, async (req, res, next) => {
  try {
    const rewards = await getActiveRewards();
    const existingWin = await Spin.findOne({ user: req.user.id, isWin: true });
    if (existingWin) return alreadyWon(res, existingWin, rewards);

    const candidates = rewards.filter((r) => r.weight > 0);
    if (candidates.length === 0) {
      return res.status(503).json({ message: 'No rewards are available right now' });
    }

    // The server decides the result; the client only animates to it
    const reward = pickWeighted(candidates);
    let spin;
    try {
      spin = await Spin.create({
        user: req.user.id,
        mobile: req.user.mobile,
        reward: reward._id,
        rewardLabel: reward.label,
        rewardDescription: reward.description,
        rewardIcon: reward.icon,
        isWin: reward.isWin,
        couponCode: reward.isWin ? generateCouponCode() : undefined,
      });
    } catch (err) {
      // Duplicate key: a parallel request already recorded this user's win
      if (err.code === 11000) {
        const win = await Spin.findOne({ user: req.user.id, isWin: true });
        if (win) return alreadyWon(res, win, rewards);
      }
      throw err;
    }

    res.status(201).json({ spin: serializeSpin(spin, rewards) });
  } catch (err) {
    next(err);
  }
});

// Records when the user tapped "Claim on WhatsApp"
router.post('/spin/claim', requireAuth, async (req, res, next) => {
  try {
    const win = await Spin.findOne({ user: req.user.id, isWin: true });
    if (!win) return res.status(404).json({ message: 'No reward to claim' });
    if (!win.claimedAt) {
      win.claimedAt = new Date();
      await win.save();
    }
    res.json({ claimedAt: win.claimedAt });
  } catch (err) {
    next(err);
  }
});

export default router;
