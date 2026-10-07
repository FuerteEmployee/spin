const env = process.env;

const config = {
  port: Number(env.PORT) || 5000,
  mongoUri: env.MONGO_URI || 'mongodb://127.0.0.1:27017/spin_win',
  jwtSecret: env.JWT_SECRET || 'dev-only-secret',
  jwtExpiresIn: env.JWT_EXPIRES_IN || '7d',
  clientOrigin: env.CLIENT_ORIGIN || 'http://localhost:5173',
  whatsappNumber: (env.WHATSAPP_NUMBER || '').replace(/\D/g, ''),
  brandName: env.BRAND_NAME || 'Spin & Win',
  showOtpOnScreen: env.SHOW_OTP_ON_SCREEN !== 'false',
  otpTtlSeconds: Number(env.OTP_TTL_SECONDS) || 300,
  otpResendSeconds: Number(env.OTP_RESEND_SECONDS) || 30,
  otpMaxAttempts: 5,
};

if (env.NODE_ENV === 'production' && !env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

export default config;
