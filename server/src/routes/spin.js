import { Router } from 'express';
import Spin from '../models/Spin.js';
import { requireAuth } from '../middleware/auth.js';
import { getActiveRewards, getSettings } from '../services/site.js';
import { generateCouponCode, pickWeighted } from '../utils/random.js';

const router = Router();

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
    redeemedAt: spin.redeemedAt || null,
  };
}

function alreadyWon(res, win, rewards) {
  return res
    .status(409)
    .json({ code: 'ALREADY_WON', message: 'This mobile number has already used its spin', spin: serializeSpin(win, rewards) });
}

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
    const [settings, rewards] = await Promise.all([getSettings(), getActiveRewards()]);
    const existingWin = await Spin.findOne({ user: req.user.id, isWin: true });
    if (existingWin) return alreadyWon(res, existingWin, rewards);

    if (!settings.campaignActive) {
      return res.status(403).json({ code: 'CAMPAIGN_CLOSED', message: settings.closedMessage || 'This offer has ended' });
    }

    const candidates = rewards.filter((r) => r.weight > 0);
    if (candidates.length === 0) {
      return res.status(503).json({ message: 'No rewards are available right now' });
    }

    // The server decides the result; the client only animates to it
    const reward = pickWeighted(candidates);
    let spin;
    for (let attempt = 1; !spin; attempt++) {
      try {
        spin = await Spin.create({
          user: req.user.id,
          mobile: req.user.mobile,
          reward: reward._id,
          rewardLabel: reward.label,
          rewardDescription: reward.description,
          rewardIcon: reward.icon,
          isWin: reward.isWin,
          couponCode: reward.isWin ? generateCouponCode(settings.couponPrefix) : undefined,
        });
      } catch (err) {
        if (err.code !== 11000) throw err;
        // A parallel request already recorded this user's win
        if (err.keyPattern?.user) {
          const win = await Spin.findOne({ user: req.user.id, isWin: true });
          if (win) return alreadyWon(res, win, rewards);
        }
        // Coupon code collision: try a new code
        if (!err.keyPattern?.couponCode || attempt >= 5) throw err;
      }
    }

    res.status(201).json({ spin: serializeSpin(spin, rewards) });
  } catch (err) {
    next(err);
  }
});

// Records when the user tapped the WhatsApp button
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
