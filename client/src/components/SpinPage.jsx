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
  // True from the tap until the wheel stops
  const spinLock = useRef(false);

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
    // The lock is a ref, set before the request, so a fast double tap can't start a second
    // request while the first is still waiting for the server (state updates aren't instant)
    if (spinLock.current || win || rewards.length === 0) return;
    spinLock.current = true;
    setSpinning(true);
    setError('');
    setResult(null);
    try {
      const spin = await spinWheel();
      pendingSpin.current = spin;
      setRotation((current) => spinTargetRotation(current, spin.rewardIndex, rewards.length));
      // Fallback in case transitionend never fires (e.g. tab in background)
      clearTimeout(spinTimer.current);
      spinTimer.current = setTimeout(handleSpinEnd, SPIN_DURATION + 500);
    } catch (err) {
      spinLock.current = false;
      setSpinning(false);
      if (err.code === 'ALREADY_WON') setWin(err.data.spin);
      else handleError(err);
    }
  }

  function handleSpinEnd() {
    clearTimeout(spinTimer.current);
    const spin = pendingSpin.current;
    pendingSpin.current = null;
    if (!spin) return;
    spinLock.current = false;
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
  // Voucher rewards, once per name (the wheel can repeat a reward in several segments)
  const prizes = rewards
    .filter((r) => r.isWin)
    .filter((r, i, list) => list.findIndex((other) => other.label === r.label) === i);
  const notes = prizes.filter((r) => r.showNote && r.description);

  return (
    <main className="spin-page">
      <header className="topbar">
        {/* With a logo, the brand is shown as the centred logo below instead */}
        <span className="brand">{!site.images.logo && <>🎡 {site.brandName}</>}</span>
        <div className="topbar-user">
          <span className="user-pill">+91 {mobile}</span>
          <button type="button" className="link" onClick={onLogout}>Logout</button>
        </div>
      </header>

      {site.images.logo && <img className="site-logo" src={site.images.logo} alt={site.brandName} />}

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
            {prizes.map((r) => (
              <li key={r.id} style={{ '--chip': r.color }}>
                <span aria-hidden="true">{r.icon}</span> {r.label}
              </li>
            ))}
          </ul>

          {notes.length > 0 && (
            <ul className="prize-notes">
              {notes.map((r) => (
                <li key={r.id}>
                  <strong>{r.label}:</strong> {r.description}
                </li>
              ))}
            </ul>
          )}
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
