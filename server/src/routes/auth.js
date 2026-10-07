import { Router } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import Otp from '../models/Otp.js';
import User from '../models/User.js';
import { generateOtp, hashOtp, safeEqual } from '../utils/random.js';

const router = Router();
const MOBILE_REGEX = /^\d{10}$/;

function normalizeMobile(value) {
  return String(value || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
}

router.post('/send-otp', async (req, res, next) => {
  try {
    const mobile = normalizeMobile(req.body.mobile);
    if (!MOBILE_REGEX.test(mobile)) {
      return res.status(400).json({ message: 'Enter a valid 10-digit mobile number' });
    }

    const existing = await Otp.findOne({ mobile }).sort({ createdAt: -1 });
    if (existing) {
      const elapsed = (Date.now() - existing.createdAt.getTime()) / 1000;
      if (elapsed < config.otpResendSeconds) {
        const retryAfter = Math.ceil(config.otpResendSeconds - elapsed);
        return res.status(429).json({ message: `Please wait ${retryAfter}s before requesting a new OTP`, retryAfter });
      }
    }

    const otp = generateOtp();
    await Otp.deleteMany({ mobile });
    await Otp.create({
      mobile,
      codeHash: hashOtp(mobile, otp),
      expiresAt: new Date(Date.now() + config.otpTtlSeconds * 1000),
    });

    // TODO: plug in an SMS provider here (MSG91, Twilio, Fast2SMS...) and set SHOW_OTP_ON_SCREEN=false
    res.json({
      message: 'OTP generated',
      mobile,
      expiresIn: config.otpTtlSeconds,
      resendIn: config.otpResendSeconds,
      ...(config.showOtpOnScreen && { otp }),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/verify-otp', async (req, res, next) => {
  try {
    const mobile = normalizeMobile(req.body.mobile);
    const otp = String(req.body.otp || '').trim();
    if (!MOBILE_REGEX.test(mobile) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'Enter the 6-digit OTP' });
    }

    const record = await Otp.findOne({ mobile }).sort({ createdAt: -1 });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP expired, please request a new one' });
    }

    if (!safeEqual(record.codeHash, hashOtp(mobile, otp))) {
      record.attempts += 1;
      if (record.attempts >= config.otpMaxAttempts) {
        await record.deleteOne();
        return res.status(429).json({ message: 'Too many wrong attempts, please request a new OTP' });
      }
      await record.save();
      const left = config.otpMaxAttempts - record.attempts;
      return res.status(400).json({ message: `Incorrect OTP, ${left} attempt${left === 1 ? '' : 's'} left` });
    }

    await Otp.deleteMany({ mobile });
    const user = await User.findOneAndUpdate(
      { mobile },
      { $set: { lastLoginAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const token = jwt.sign({ sub: user.id, mobile }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    res.json({ token, user: { id: user.id, mobile } });
  } catch (err) {
    next(err);
  }
});

export default router;
