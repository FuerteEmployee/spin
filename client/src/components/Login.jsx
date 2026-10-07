import { useEffect, useState } from 'react';
import { BRAND_NAME } from '../config.js';
import { isValidMobile, sendOtp, verifyOtp } from '../services/spinService.js';
import OtpInput from './OtpInput.jsx';

export default function Login({ onLogin }) {
  const [step, setStep] = useState('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [shownOtp, setShownOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function requestOtp(event) {
    event?.preventDefault();
    setError('');
    if (!isValidMobile(mobile)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const data = await sendOtp(mobile);
      setShownOtp(data.otp);
      setOtp('');
      setResendIn(data.resendIn);
      setStep('otp');
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
      onLogin(await verifyOtp(mobile, code));
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
        <div className="login-badge" aria-hidden="true">🎡</div>
        <h1>{BRAND_NAME}</h1>
        <p>Spin the wheel and win exciting rewards — up to <strong>6 months free!</strong></p>
      </div>

      <section className="card">
        {step === 'mobile' ? (
          <form onSubmit={requestOtp} noValidate>
            <h2>Login to spin</h2>
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

      <p className="fineprint">T&amp;C apply.</p>
    </main>
  );
}
