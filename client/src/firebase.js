// Firebase: phone OTP by SMS and Analytics. The config comes from client/.env (VITE_FIREBASE_*),
// so test keys can be swapped for real ones without code changes. The SDK is loaded on demand.
import { ServiceError } from './services/api.js';

const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

let appPromise;
function getApp() {
  appPromise ||= import('firebase/app').then(({ initializeApp }) => initializeApp(firebaseConfig));
  return appPromise;
}

// ─── Analytics ──────────────────────────────────────────────────────

let analyticsPromise;

export function startAnalytics() {
  if (!firebaseConfigured || !firebaseConfig.measurementId) return Promise.resolve(null);
  analyticsPromise ||= Promise.all([import('firebase/analytics'), getApp()])
    .then(async ([{ getAnalytics, isSupported }, app]) => ((await isSupported()) ? getAnalytics(app) : null))
    .catch(() => null);
  return analyticsPromise;
}

// Fire-and-forget; analytics must never break the page
export function trackEvent(name, params) {
  startAnalytics()
    .then(async (analytics) => {
      if (!analytics) return;
      const { logEvent } = await import('firebase/analytics');
      logEvent(analytics, name, params);
    })
    .catch(() => {});
}

// ─── Phone OTP ──────────────────────────────────────────────────────

export const RECAPTCHA_CONTAINER_ID = 'recaptcha-container';

const ERROR_MESSAGES = {
  'auth/invalid-phone-number': 'Enter a valid 10-digit mobile number',
  'auth/missing-phone-number': 'Enter a valid 10-digit mobile number',
  'auth/too-many-requests': 'Too many attempts from this device. Please try again later.',
  'auth/quota-exceeded': 'OTP limit reached for now. Please try again later.',
  'auth/invalid-verification-code': 'Incorrect OTP, please try again',
  'auth/code-expired': 'OTP expired, please request a new one',
  'auth/session-expired': 'OTP expired, please request a new one',
  'auth/invalid-app-credential': 'Security check failed. Please reload the page and try again.',
  'auth/network-request-failed': 'Could not reach the server. Check your internet connection and try again.',
  // Setup problems (seen while testing, not by customers once configured)
  'auth/operation-not-allowed': 'Phone login is not enabled in Firebase (Authentication → Sign-in method → Phone).',
  'auth/billing-not-enabled': 'SMS sending needs the Firebase Blaze plan. Use a test phone number from the Firebase console for now.',
  'auth/unauthorized-domain': 'This website is not in Firebase Authentication → Settings → Authorized domains.',
  'auth/captcha-check-failed': 'This website is not in Firebase Authentication → Settings → Authorized domains.',
  'auth/invalid-api-key': 'The Firebase API key in client/.env is not valid.',
};

function toServiceError(err, fallback) {
  if (!ERROR_MESSAGES[err?.code]) console.error(err);
  return new ServiceError(ERROR_MESSAGES[err?.code] || fallback, err?.code || 'FIREBASE');
}

let verifier = null;

async function loadAuth() {
  const [authModule, app] = await Promise.all([import('firebase/auth'), getApp()]);
  const auth = authModule.getAuth(app);
  auth.languageCode = 'en';
  // Phone auth's reCAPTCHA check fails on localhost (auth/invalid-app-credential). For local
  // testing, set VITE_FIREBASE_PHONE_TEST_MODE=true and log in with a "phone number for testing"
  // from the Firebase console; real numbers don't work in this mode. Never enable it in production.
  if (env.VITE_FIREBASE_PHONE_TEST_MODE === 'true') auth.settings.appVerificationDisabledForTesting = true;
  return { ...authModule, auth };
}

// Sends the SMS. Returns a confirmation to pass to confirmFirebaseOtp().
// Needs an element with id RECAPTCHA_CONTAINER_ID on the page (invisible reCAPTCHA).
export async function sendFirebaseOtp(mobile) {
  if (!firebaseConfigured) throw new ServiceError('Firebase is not configured (client/.env)', 'FIREBASE_CONFIG');
  const { auth, RecaptchaVerifier, signInWithPhoneNumber } = await loadAuth();
  try {
    if (!verifier) {
      // grecaptcha can't render twice into the same element, even after clear(),
      // so every verifier gets a brand-new child element
      const host = document.getElementById(RECAPTCHA_CONTAINER_ID);
      if (!host) throw new Error(`#${RECAPTCHA_CONTAINER_ID} is missing`);
      const element = document.createElement('div');
      host.replaceChildren(element);
      verifier = new RecaptchaVerifier(auth, element, { size: 'invisible' });
    }
    return await signInWithPhoneNumber(auth, `+91${mobile}`, verifier);
  } catch (err) {
    resetRecaptcha();
    throw toServiceError(err, 'Could not send the OTP. Please try again.');
  }
}

// Checks the code and returns a Firebase ID token for the server to verify
export async function confirmFirebaseOtp(confirmation, code) {
  try {
    const credential = await confirmation.confirm(code);
    const idToken = await credential.user.getIdToken();
    // The app keeps its own session; Firebase's is only needed for this one exchange
    const { auth, signOut } = await loadAuth();
    signOut(auth).catch(() => {});
    return idToken;
  } catch (err) {
    throw toServiceError(err, 'Could not verify the OTP. Please try again.');
  }
}

export function resetRecaptcha() {
  try {
    verifier?.clear();
  } catch {
    // already cleared
  }
  verifier = null;
  document.getElementById(RECAPTCHA_CONTAINER_ID)?.replaceChildren();
}
