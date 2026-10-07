import express, { Router } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import config from '../config/index.js';
import Media from '../models/Media.js';
import Reward from '../models/Reward.js';
import Spin from '../models/Spin.js';
import User from '../models/User.js';
import { requireAdmin } from '../middleware/auth.js';
import {
  IMAGE_SLOTS,
  REQUIRED_TEXT_FIELDS,
  TEXT_FIELDS,
  adminReward,
  adminSettings,
  getActiveRewards,
  getSettings,
} from '../services/site.js';
import { DEFAULT_REWARDS } from '../seed.js';
import { safeEqual } from '../utils/random.js';
import { rateLimit } from '../utils/rateLimit.js';

const router = Router();
const PAGE_SIZE = 25;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts, please try again later' });

router.post('/login', loginLimiter, (req, res) => {
  if (!config.adminPassword) {
    return res.status(503).json({ message: 'Admin login is not set up. Set ADMIN_PASSWORD in server/.env and restart.' });
  }
  const username = String(req.body.username || '');
  const password = String(req.body.password || '');
  // Evaluate both so a wrong username takes as long as a wrong password
  const userOk = safeEqual(username, config.adminUsername);
  const passOk = safeEqual(password, config.adminPassword);
  if (!userOk || !passOk) return res.status(401).json({ message: 'Wrong username or password' });

  const token = jwt.sign({ role: 'admin' }, config.jwtSecret, { expiresIn: config.adminJwtExpiresIn });
  res.json({ token });
});

router.use(requireAdmin);

// ─── Dashboard ──────────────────────────────────────────────────────

function startOfTodayIST() {
  const IST_OFFSET = 330 * 60 * 1000;
  const ist = new Date(Date.now() + IST_OFFSET);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET);
}

router.get('/stats', async (req, res, next) => {
  try {
    const wins = { isWin: true };
    const [users, winners, claimed, redeemed, today, byReward, rewards] = await Promise.all([
      User.countDocuments(),
      Spin.countDocuments(wins),
      Spin.countDocuments({ ...wins, claimedAt: { $type: 'date' } }),
      Spin.countDocuments({ ...wins, redeemedAt: { $type: 'date' } }),
      Spin.countDocuments({ ...wins, createdAt: { $gte: startOfTodayIST() } }),
      Spin.aggregate([
        { $match: wins },
        { $group: { _id: '$reward', label: { $last: '$rewardLabel' }, icon: { $last: '$rewardIcon' }, count: { $sum: 1 } } },
      ]),
      getActiveRewards(),
    ]);

    const counts = new Map(byReward.map((r) => [r._id.toString(), r]));
    const totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);
    const breakdown = rewards.map((r) => ({
      id: r.id,
      label: r.label,
      icon: r.icon,
      color: r.color,
      isWin: r.isWin,
      chance: totalWeight ? (r.weight / totalWeight) * 100 : 0,
      won: counts.get(r.id)?.count || 0,
    }));
    // Rewards that were deleted but have already been won
    for (const [id, r] of counts) {
      if (!rewards.some((reward) => reward.id === id)) {
        breakdown.push({ id, label: r.label, icon: r.icon, color: '#94a3b8', isWin: true, chance: null, won: r.count, removed: true });
      }
    }

    res.json({ users, winners, claimed, redeemed, today, notWon: Math.max(users - winners, 0), breakdown });
  } catch (err) {
    next(err);
  }
});

// ─── Settings ───────────────────────────────────────────────────────

router.get('/settings', async (req, res, next) => {
  try {
    res.json(adminSettings(await getSettings()));
  } catch (err) {
    next(err);
  }
});

function validateSettings(body) {
  const update = {};

  for (const [field, max] of Object.entries(TEXT_FIELDS)) {
    if (body[field] === undefined) continue;
    const value = String(body[field]).replace(/\r\n/g, '\n').trim();
    if (value.length > max) return { error: `"${field}" can be at most ${max} characters` };
    if (!value && REQUIRED_TEXT_FIELDS.includes(field)) return { error: `"${field}" can't be empty` };
    update[field] = value;
  }

  if (body.campaignActive !== undefined) update.campaignActive = Boolean(body.campaignActive);

  if (body.claimTarget !== undefined) {
    if (!['self', 'business'].includes(body.claimTarget)) return { error: 'Choose where the voucher is sent' };
    update.claimTarget = body.claimTarget;
  }

  if (body.businessWhatsapp !== undefined) {
    const number = String(body.businessWhatsapp).replace(/\D/g, '');
    if (number && !/^\d{10,15}$/.test(number)) {
      return { error: 'Enter the business WhatsApp number with country code, e.g. 919876543210' };
    }
    update.businessWhatsapp = number;
  }

  if (body.couponPrefix !== undefined) {
    const prefix = String(body.couponPrefix).trim().toUpperCase();
    if (!/^[A-Z0-9]{0,8}$/.test(prefix)) return { error: 'Coupon prefix can only have letters and numbers (max 8)' };
    update.couponPrefix = prefix;
  }

  if (body.bgOverlay !== undefined) {
    const overlay = Number(body.bgOverlay);
    if (!Number.isFinite(overlay) || overlay < 0 || overlay > 90) return { error: 'Overlay must be between 0 and 90' };
    update.bgOverlay = Math.round(overlay);
  }

  return { update };
}

router.put('/settings', async (req, res, next) => {
  try {
    const { update, error } = validateSettings(req.body || {});
    if (error) return res.status(400).json({ message: error });

    const settings = await getSettings();
    settings.set(update);
    if (settings.claimTarget === 'business' && !settings.businessWhatsapp) {
      return res.status(400).json({ message: 'Add the business WhatsApp number, or send vouchers to the customer instead' });
    }
    await settings.save();
    res.json(adminSettings(settings));
  } catch (err) {
    next(err);
  }
});

// ─── Images ─────────────────────────────────────────────────────────

const rawImage = express.raw({ type: IMAGE_TYPES, limit: '6mb' });

router.post('/images/:slot', rawImage, async (req, res, next) => {
  try {
    const { slot } = req.params;
    if (!IMAGE_SLOTS.includes(slot)) return res.status(404).json({ message: 'Unknown image' });
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ message: 'Upload a JPG, PNG or WebP image' });
    }

    const media = await Media.create({
      data: req.body,
      contentType: req.get('content-type').split(';')[0].trim(),
      size: req.body.length,
    });
    const settings = await getSettings();
    const previous = settings[slot];
    settings[slot] = media._id;
    await settings.save();
    if (previous) await Media.deleteOne({ _id: previous });

    res.json(adminSettings(settings));
  } catch (err) {
    next(err);
  }
});

router.delete('/images/:slot', async (req, res, next) => {
  try {
    const { slot } = req.params;
    if (!IMAGE_SLOTS.includes(slot)) return res.status(404).json({ message: 'Unknown image' });
    const settings = await getSettings();
    const previous = settings[slot];
    settings[slot] = null;
    await settings.save();
    if (previous) await Media.deleteOne({ _id: previous });
    res.json(adminSettings(settings));
  } catch (err) {
    next(err);
  }
});

// ─── Rewards ────────────────────────────────────────────────────────

router.get('/rewards', async (req, res, next) => {
  try {
    const defaults = DEFAULT_REWARDS.map((r) => ({ textColor: '#ffffff', description: '', isWin: true, ...r }));
    res.json({ rewards: (await getActiveRewards()).map(adminReward), defaults });
  } catch (err) {
    next(err);
  }
});

function validateRewards(list) {
  if (!Array.isArray(list) || list.length < 2 || list.length > 12) {
    return { error: 'The wheel needs between 2 and 12 rewards' };
  }

  const rewards = [];
  for (const [i, item] of list.entries()) {
    const n = `Reward ${i + 1}`;
    const label = String(item.label || '').trim();
    const lines = String(item.wheelLabel || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const icon = String(item.icon || '').trim();
    const description = String(item.description || '').trim();
    const weight = Number(item.weight);

    if (!label || label.length > 60) return { error: `${n}: name is required (max 60 characters)` };
    if (lines.length === 0 || lines.length > 2 || lines.some((line) => line.length > 14)) {
      return { error: `${n}: wheel text needs 1 or 2 lines of up to 14 characters` };
    }
    if (icon.length > 16) return { error: `${n}: icon is too long` };
    if (description.length > 200) return { error: `${n}: description can be at most 200 characters` };
    if (!HEX_COLOR.test(item.color) || !HEX_COLOR.test(item.textColor)) return { error: `${n}: pick valid colours` };
    if (!Number.isFinite(weight) || weight < 0 || weight > 1_000_000) return { error: `${n}: chance must be 0 or more` };

    rewards.push({
      id: typeof item.id === 'string' ? item.id : null,
      data: {
        label,
        wheelLabel: lines.join('\n'),
        icon: icon || '🎁',
        description,
        color: item.color,
        textColor: item.textColor,
        weight,
        isWin: item.isWin !== false,
      },
    });
  }

  if (!rewards.some((r) => r.data.weight > 0)) return { error: 'At least one reward needs a chance above 0' };
  return { rewards };
}

// Saves the whole wheel at once: updates, adds, reorders and removes rewards
router.put('/rewards', async (req, res, next) => {
  try {
    const { rewards, error } = validateRewards(req.body?.rewards);
    if (error) return res.status(400).json({ message: error });

    const existing = new Map((await Reward.find()).map((r) => [r.id, r]));
    const keep = [];
    for (const [order, { id, data }] of rewards.entries()) {
      const doc = id && existing.get(id);
      if (doc) {
        doc.set({ ...data, order, active: true });
        await doc.save();
        keep.push(doc._id);
      } else {
        const created = await Reward.create({ ...data, order });
        keep.push(created._id);
      }
    }
    await Reward.deleteMany({ _id: { $nin: keep } });

    res.json({ rewards: (await getActiveRewards()).map(adminReward) });
  } catch (err) {
    next(err);
  }
});

// ─── Participants ───────────────────────────────────────────────────

const FILTERS = {
  all: {},
  winners: { win: { $exists: true } },
  'not-won': { win: { $exists: false } },
  claimed: { 'win.claimedAt': { $type: 'date' } },
  redeemed: { 'win.redeemedAt': { $type: 'date' } },
  unredeemed: { win: { $exists: true }, 'win.redeemedAt': { $not: { $type: 'date' } } },
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function participantsPipeline(query) {
  const q = String(query.q || '').trim().slice(0, 40);
  const match = { ...(FILTERS[query.filter] || FILTERS.all) };
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    match.$or = [{ mobile: rx }, { 'win.couponCode': rx }];
  }

  return [
    { $lookup: { from: 'spins', localField: '_id', foreignField: 'user', as: 'spins' } },
    {
      $addFields: {
        win: { $first: { $filter: { input: '$spins', cond: '$$this.isWin' } } },
        spinCount: { $size: '$spins' },
      },
    },
    { $project: { spins: 0 } },
    { $match: match },
    { $sort: { lastLoginAt: -1, _id: -1 } },
  ];
}

function serializeParticipant(p) {
  return {
    id: p._id.toString(),
    mobile: p.mobile,
    joinedAt: p.createdAt,
    lastLoginAt: p.lastLoginAt,
    spinCount: p.spinCount,
    win: p.win
      ? {
          id: p.win._id.toString(),
          label: p.win.rewardLabel,
          icon: p.win.rewardIcon,
          couponCode: p.win.couponCode,
          wonAt: p.win.createdAt,
          claimedAt: p.win.claimedAt || null,
          redeemedAt: p.win.redeemedAt || null,
        }
      : null,
  };
}

router.get('/participants', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const [result] = await User.aggregate([
      ...participantsPipeline(req.query),
      {
        $facet: {
          items: [{ $skip: (page - 1) * PAGE_SIZE }, { $limit: PAGE_SIZE }],
          total: [{ $count: 'n' }],
        },
      },
    ]);
    const total = result.total[0]?.n || 0;
    res.json({
      items: result.items.map(serializeParticipant),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (err) {
    next(err);
  }
});

function csvCell(value) {
  let text = value == null ? '' : String(value);
  // Stop spreadsheet apps from treating a cell as a formula
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatIST(date) {
  return date ? new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '';
}

router.get('/export.csv', async (req, res, next) => {
  try {
    const rows = (await User.aggregate(participantsPipeline(req.query))).map(serializeParticipant);
    const lines = [
      ['Mobile', 'First login', 'Last login', 'Reward', 'Voucher code', 'Won at', 'WhatsApp tapped at', 'Redeemed at'],
      ...rows.map((p) => [
        p.mobile,
        formatIST(p.joinedAt),
        formatIST(p.lastLoginAt),
        p.win?.label,
        p.win?.couponCode,
        formatIST(p.win?.wonAt),
        formatIST(p.win?.claimedAt),
        formatIST(p.win?.redeemedAt),
      ]),
    ];
    const csv = '﻿' + lines.map((line) => line.map(csvCell).join(',')).join('\r\n');
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="spin-participants-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// Mark a voucher as used at the store (or undo it)
router.patch('/spins/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Voucher not found' });
    const spin = await Spin.findOne({ _id: req.params.id, isWin: true });
    if (!spin) return res.status(404).json({ message: 'Voucher not found' });
    spin.redeemedAt = req.body?.redeemed ? spin.redeemedAt || new Date() : undefined;
    await spin.save();
    res.json({ redeemedAt: spin.redeemedAt || null });
  } catch (err) {
    next(err);
  }
});

// Deletes a participant's spins so that number can spin again
router.delete('/participants/:id/spins', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Participant not found' });
    const { deletedCount } = await Spin.deleteMany({ user: req.params.id });
    res.json({ deleted: deletedCount });
  } catch (err) {
    next(err);
  }
});

export default router;
