import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { trackEvent } from '../firebase.js';
import { getMyWin, markClaimed, spinWheel } from '../services/spinService.js';
import SpinWheel, { spinTargetRotation } from './SpinWheel.jsx';
import PrizeModal from './PrizeModal.jsx';
import VoucherCard from './VoucherCard.jsx';

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const SPIN_DURATION = prefersReducedMotion ? 1500 : 6000;

function celebrate() {
  if (prefersReducedMotion) return;
  const colors = ['#fbbf24', '#ec4899', '#7c3aed', '#10b981', '#ffffff'];
  confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, colors, zIndex: 1000 });
  setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0 }, colors, zIndex: 1000 }), 250);
  setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1 }, colors, zIndex: 1000 }), 400);
}

// One spin per mobile number: once there is a win, the page shows the voucher instead of the wheel
export default function SpinPage({ site, mobile, onLogout }) {
  const { rewards } = site;
  const [win, setWin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState('');
  const pendingSpin = useRef(null);
  const spinTimer = useRef(null);

  useEffect(() => () => clearTimeout(spinTimer.current), []);

  const handleError = useCallback(
    (err) => {
      if (err.code === 'UNAUTHORIZED') onLogout();
      else setError(err.message);
    },
    [onLogout]
  );

  useEffect(() => {
    getMyWin()
      .then(setWin)
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [handleError]);

  async function handleSpin() {
    if (spinning || win || rewards.length === 0) return;
    setError('');
    setResult(null);
    try {
      const spin = await spinWheel();
      pendingSpin.current = spin;
      setSpinning(true);
      setRotation((current) => spinTargetRotation(current, spin.rewardIndex, rewards.length));
      // Fallback in case transitionend never fires (e.g. tab in background)
      clearTimeout(spinTimer.current);
      spinTimer.current = setTimeout(handleSpinEnd, SPIN_DURATION + 500);
    } catch (err) {
      if (err.code === 'ALREADY_WON') setWin(err.data.spin);
      else handleError(err);
    }
  }

  function handleSpinEnd() {
    clearTimeout(spinTimer.current);
    const spin = pendingSpin.current;
    pendingSpin.current = null;
    if (!spin) return;
    setSpinning(false);
    trackEvent('spin', { reward: spin.label, is_win: spin.isWin });
    if (spin.isWin) celebrate();
    setResult(spin);
  }

  const closeModal = useCallback(() => {
    // The voucher replaces the wheel only once the popup is closed
    if (result?.isWin) setWin(result);
    setResult(null);
  }, [result]);

  function handleClaim() {
    trackEvent('claim_whatsapp', { target: site.claimTarget });
    markClaimed()
      .then((claimedAt) => setWin((current) => current && { ...current, claimedAt }))
      .catch(() => {});
  }

  function spinAgain() {
    setResult(null);
    // Let the modal close before the wheel starts moving
    setTimeout(handleSpin, 150);
  }

  const showWheel = !loading && !win && site.campaignActive && rewards.length > 0;

  return (
    <main className="spin-page">
      <header className="topbar">
        <span className="brand">
          {site.images.logo ? <img src={site.images.logo} alt="" /> : <span aria-hidden="true">🎡</span>}
          {site.brandName}
        </span>
        <div className="topbar-user">
          <span className="user-pill">+91 {mobile}</span>
          <button type="button" className="link" onClick={onLogout}>Logout</button>
        </div>
      </header>

      {loading && <p className="page-status">Loading…</p>}

      {!loading && win && (
        <section className="voucher-page" aria-labelledby="voucher-title">
          <VoucherCard site={site} mobile={mobile} spin={win} onClaim={handleClaim} titleId="voucher-title" />
          <p className="muted center">This mobile number has used its spin.</p>
        </section>
      )}

      {!loading && !win && !site.campaignActive && <p className="notice">{site.closedMessage}</p>}

      {showWheel && (
        <>
          <section className="spin-hero">
            <h1>{site.spinTitle}</h1>
            {site.spinSubtitle && <p className="muted">{site.spinSubtitle}</p>}
          </section>

          <SpinWheel
            rewards={rewards}
            rotation={rotation}
            spinning={spinning}
            duration={SPIN_DURATION}
            onSpinEnd={handleSpinEnd}
            onSpinClick={handleSpin}
            canSpin={!spinning && !result}
          />

          <button
            type="button"
            className="btn btn-primary btn-spin"
            onClick={handleSpin}
            disabled={spinning || Boolean(result)}
          >
            {spinning ? 'Spinning…' : 'SPIN NOW'}
          </button>

          <ul className="prize-list" aria-label="Prizes">
            {rewards
              .filter((r) => r.isWin)
              .filter((r, i, list) => list.findIndex((other) => other.label === r.label) === i)
              .map((r) => (
                <li key={r.id} style={{ '--chip': r.color }}>
                  <span aria-hidden="true">{r.icon}</span> {r.label}
                </li>
              ))}
          </ul>
        </>
      )}

      {error && <p className="error center" role="alert">{error}</p>}

      {result && (
        <PrizeModal
          site={site}
          mobile={mobile}
          result={result}
          onClaim={handleClaim}
          onSpinAgain={spinAgain}
          onClose={closeModal}
        />
      )}
    </main>
  );
}
