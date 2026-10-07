import { useEffect, useRef, useState } from 'react';
import { confirmFirebaseOtp, RECAPTCHA_CONTAINER_ID, resetRecaptcha, sendFirebaseOtp, trackEvent } from '../firebase.js';
import { isValidMobile, loginWithFirebase, sendOtp, verifyOtp } from '../services/spinService.js';
import OtpInput from './OtpInput.jsx';

const FIREBASE_RESEND_SECONDS = 30;

// site.otpMode: "firebase" sends a real SMS through Firebase Phone Auth;
// "screen" uses the server's OTP, shown on screen (no SMS provider).
export default function Login({ site, onLogin }) {
  const useFirebase = site.otpMode === 'firebase';
  const [step, setStep] = useState('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [shownOtp, setShownOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const confirmation = useRef(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // The invisible reCAPTCHA is bound to this page's container element
  useEffect(() => resetRecaptcha, []);

  async function requestFirebaseOtp() {
    confirmation.current = await sendFirebaseOtp(mobile);
    setShownOtp('');
    setOtp('');
    setResendIn(FIREBASE_RESEND_SECONDS);
    setStep('otp');
  }

  async function requestScreenOtp() {
    const data = await sendOtp(mobile);
    setShownOtp(data.otp || '');
    setOtp('');
    setResendIn(data.resendIn);
    setStep('otp');
  }

  async function verify(code) {
    if (!useFirebase) return verifyOtp(mobile, code);
    if (!confirmation.current) throw new Error('OTP expired, please request a new one');
    const idToken = await confirmFirebaseOtp(confirmation.current, code);
    return loginWithFirebase(idToken);
  }

  async function requestOtp(event) {
    event?.preventDefault();
    setError('');
    if (!isValidMobile(mobile)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      await (useFirebase ? requestFirebaseOtp() : requestScreenOtp());
    } catch (err) {
      setError(err.message);
      if (err.data?.retryAfter) setResendIn(err.data.retryAfter);
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(code = otp) {
    setError('');
    if (code.length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const session = await verify(code);
      trackEvent('login', { method: useFirebase ? 'firebase_phone' : 'screen_otp' });
      onLogin(session);
    } catch (err) {
      setError(err.message);
      setOtp('');
      setLoading(false);
    }
  }

  function changeNumber() {
    setStep('mobile');
    setOtp('');
    setShownOtp('');
    setError('');
  }

  return (
    <main className="login">
      <div className="login-hero">
        {/* The logo already shows the brand name, so the text name is only used without one */}
        {site.images.logo ? (
          <img className="site-logo" src={site.images.logo} alt={site.brandName} />
        ) : (
          <>
            <div className="login-badge" aria-hidden="true">🎡</div>
            <p className="login-brand">{site.brandName}</p>
          </>
        )}
        <h1>{site.headline}</h1>
        {site.subheadline && <p>{site.subheadline}</p>}
      </div>

      {!site.campaignActive && (
        <p className="notice" role="status">
          {site.closedMessage} Already won? Log in to see your voucher.
        </p>
      )}

      <section className="card">
        {step === 'mobile' ? (
          <form onSubmit={requestOtp} noValidate>
            <h2>{site.campaignActive ? 'Login to spin' : 'Login'}</h2>
            <p className="muted">Enter your mobile number to get an OTP</p>

            <label className="field-label" htmlFor="mobile">Mobile number</label>
            <div className={`phone-field ${error ? 'has-error' : ''}`}>
              <span className="phone-prefix">🇮🇳 +91</span>
              <input
                id="mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98765 43210"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                autoFocus
              />
            </div>

            {error && <p className="error" role="alert">{error}</p>}

            <button className="btn btn-primary" type="submit" disabled={loading || mobile.length !== 10}>
              {loading ? 'Sending…' : 'Get OTP'}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitOtp();
            }}
            noValidate
          >
            <h2>Verify OTP</h2>
            <p className="muted">
              Sent to <strong>+91 {mobile}</strong>{' '}
              <button type="button" className="link" onClick={changeNumber}>Change</button>
            </p>

            {shownOtp && (
              <div className="otp-display" aria-live="polite">
                <span className="otp-display-label">Your OTP is</span>
                <span className="otp-display-code">{shownOtp}</span>
                <button type="button" className="chip" onClick={() => {
                    setOtp(shownOtp);
                    submitOtp(shownOtp);
                  }}>
                  Tap to auto-fill
                </button>
              </div>
            )}

            <OtpInput value={otp} onChange={setOtp} onComplete={submitOtp} disabled={loading} />

            {error && <p className="error" role="alert">{error}</p>}

            <button className="btn btn-primary" type="submit" disabled={loading || otp.length !== 6}>
              {loading ? 'Verifying…' : 'Verify & Continue'}
            </button>

            <p className="resend">
              {resendIn > 0 ? (
                <>Resend OTP in <strong>{resendIn}s</strong></>
              ) : (
                <button type="button" className="link" onClick={requestOtp}>Resend OTP</button>
              )}
            </p>
          </form>
        )}
      </section>
      {useFirebase && <div id={RECAPTCHA_CONTAINER_ID} />}
    </main>
  );
}
