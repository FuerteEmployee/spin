import { Router } from 'express';
import mongoose from 'mongoose';
import Media from '../models/Media.js';
import { getActiveRewards, getSettings, publicReward, publicSettings } from '../services/site.js';

const router = Router();

// Everything the public page needs to render: texts, T&C, images and wheel segments
router.get('/site', async (req, res, next) => {
  try {
    const [settings, rewards] = await Promise.all([getSettings(), getActiveRewards()]);
    res.set('Cache-Control', 'no-store');
    res.json({ ...publicSettings(settings), rewards: rewards.map(publicReward) });
  } catch (err) {
    next(err);
  }
});

router.get('/media/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).end();
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).end();
    res.set('Content-Type', media.contentType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(media.data);
  } catch (err) {
    next(err);
  }
});

export default router;
