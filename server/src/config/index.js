const env = process.env;

const config = {
  port: Number(env.PORT) || 5000,
  mongoUri: env.MONGO_URI || 'mongodb://127.0.0.1:27017/spin_win',
  dnsServers: (env.DNS_SERVERS || '').split(',').map((s) => s.trim()).filter(Boolean),
  jwtSecret: env.JWT_SECRET || 'dev-only-secret',
  jwtExpiresIn: env.JWT_EXPIRES_IN || '7d',
  clientOrigin: env.CLIENT_ORIGIN || 'http://localhost:5173',
  // This server's own public URL (e.g. https://spin-api.example.com), used for image links
  // when the website is hosted on a different domain. Empty = same domain.
  publicUrl: (env.PUBLIC_URL || '').replace(/\/+$/, ''),
  // "firebase": real SMS through Firebase Phone Auth (the server only verifies Firebase ID tokens).
  // "screen": the server makes the OTP and shows it on screen (no SMS).
  otpMode: env.OTP_MODE === 'firebase' ? 'firebase' : 'screen',
  firebaseProjectId: env.FIREBASE_PROJECT_ID || '',
  showOtpOnScreen: env.SHOW_OTP_ON_SCREEN !== 'false',
  otpTtlSeconds: Number(env.OTP_TTL_SECONDS) || 300,
  otpResendSeconds: Number(env.OTP_RESEND_SECONDS) || 30,
  otpMaxAttempts: 5,
  // Admin panel login (/admin). Leaving ADMIN_PASSWORD empty disables it.
  adminUsername: env.ADMIN_USERNAME || 'admin',
  adminPassword: env.ADMIN_PASSWORD || '',
  adminJwtExpiresIn: '12h',
};

if (env.NODE_ENV === 'production' && !env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

if (config.otpMode === 'firebase' && !config.firebaseProjectId) {
  throw new Error('FIREBASE_PROJECT_ID must be set when OTP_MODE=firebase');
}

export default config;
