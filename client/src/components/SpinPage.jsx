import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { BRAND_NAME } from '../config.js';
import { getMyWins, getRewards, markClaimed, resetWins, spinWheel } from '../services/spinService.js';
import { buildWhatsAppLink } from '../whatsapp.js';
import SpinWheel, { restingRotation, spinTargetRotation } from './SpinWheel.jsx';
import RewardModal from './RewardModal.jsx';
import WhatsAppFab, { WhatsAppIcon } from './WhatsAppFab.jsx';

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

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function SpinPage({ mobile, onLogout }) {
  const [rewards, setRewards] = useState([]);
  const [wins, setWins] = useState([]);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState('');
  const pendingSpin = useRef(null);
  const spinTimer = useRef(null);

  const latestWin = wins[0] || null;

  useEffect(() => () => clearTimeout(spinTimer.current), []);

  useEffect(() => {
    Promise.all([getRewards(), getMyWins(mobile)]).then(([list, saved]) => {
      setRewards(list);
      setWins(saved);
      if (saved[0]?.rewardIndex >= 0) setRotation(restingRotation(saved[0].rewardIndex, list.length));
    });
  }, [mobile]);

  async function handleSpin() {
    if (spinning || rewards.length === 0) return;
    setError('');
    setResult(null);
    try {
      const spin = await spinWheel(mobile);
      pendingSpin.current = spin;
      setSpinning(true);
      setRotation((current) => spinTargetRotation(current, spin.rewardIndex, rewards.length));
      // Fallback in case transitionend never fires (e.g. tab in background)
      clearTimeout(spinTimer.current);
      spinTimer.current = setTimeout(handleSpinEnd, SPIN_DURATION + 500);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleSpinEnd() {
    clearTimeout(spinTimer.current);
    const spin = pendingSpin.current;
    pendingSpin.current = null;
    if (!spin) return;
    setSpinning(false);
    if (spin.isWin) {
      setWins((prev) => [spin, ...prev]);
      celebrate();
    }
    setResult(spin);
  }

  const handleClaim = useCallback(
    (spinId) => {
      markClaimed(mobile, spinId).then(setWins);
    },
    [mobile]
  );

  const closeModal = useCallback(() => setResult(null), []);

  function spinAgain() {
    setResult(null);
    // Let the modal close before the wheel starts moving
    setTimeout(handleSpin, 150);
  }

  async function handleReset() {
    if (spinning) return;
    if (!window.confirm('Clear all your rewards and start fresh?')) return;
    await resetWins(mobile);
    setWins([]);
    setResult(null);
    setError('');
  }

  return (
    <main className="spin-page">
      <header className="topbar">
        <span className="brand">🎡 {BRAND_NAME}</span>
        <div className="topbar-user">
          <span className="user-pill">+91 {mobile}</span>
          <button type="button" className="link" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <section className="spin-hero">
        <h1>{latestWin ? 'You’re a winner!' : 'Spin & Win Big'}</h1>
        <p className="muted">
          {latestWin
            ? 'Claim your reward on WhatsApp, or spin again for another one.'
            : 'Tap SPIN to try your luck. Win discounts or up to 6 months free!'}
        </p>
      </section>

      {rewards.length > 0 && (
        <SpinWheel
          rewards={rewards}
          rotation={rotation}
          spinning={spinning}
          duration={SPIN_DURATION}
          onSpinEnd={handleSpinEnd}
          onSpinClick={handleSpin}
          canSpin={!spinning}
        />
      )}

      {error && <p className="error center" role="alert">{error}</p>}

      <button type="button" className="btn btn-primary btn-spin" onClick={handleSpin} disabled={spinning}>
        {spinning ? 'Spinning…' : latestWin ? 'SPIN AGAIN' : 'SPIN NOW'}
      </button>

      {wins.length > 0 ? (
        <section className="my-rewards" aria-labelledby="my-rewards-title">
          <div className="my-rewards-head">
            <h2 id="my-rewards-title">
              My Rewards <span className="count">{wins.length}</span>
            </h2>
            <button type="button" className="btn-reset" onClick={handleReset} disabled={spinning}>
              ↺ Reset
            </button>
          </div>
          <ul className="win-list">
            {wins.map((win, i) => (
              <li key={win.id} className={`win-item ${i === 0 ? 'is-latest' : ''}`}>
                <span className="won-icon" aria-hidden="true">{win.icon}</span>
                <div className="won-text">
                  <strong>
                    {win.label}
                    {i === 0 && <span className="tag">Latest</span>}
                  </strong>
                  <span className="won-code">{win.couponCode}</span>
                  <span className="won-date">
                    {formatDate(win.wonAt)}
                    {win.claimedAt && ' · Claimed ✓'}
                  </span>
                </div>
                <a
                  className="btn btn-whatsapp btn-sm"
                  href={buildWhatsAppLink(mobile, win)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleClaim(win.id)}
                  aria-label={`Claim ${win.label} on WhatsApp`}
                >
                  <WhatsAppIcon size={18} /> Claim
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <ul className="prize-list" aria-label="Prizes">
          {rewards
            .filter((r) => r.isWin)
            .map((r) => (
              <li key={r.id} style={{ '--chip': r.color }}>
                <span aria-hidden="true">{r.icon}</span> {r.label}
              </li>
            ))}
        </ul>
      )}

      <p className="fineprint">T&amp;C apply.</p>

      {result && (
        <RewardModal
          result={result}
          whatsappLink={result.isWin ? buildWhatsAppLink(mobile, result) : ''}
          onClaim={() => handleClaim(result.id)}
          onSpinAgain={spinAgain}
          onClose={closeModal}
        />
      )}

      {latestWin && !result && (
        <WhatsAppFab href={buildWhatsAppLink(mobile, latestWin)} onClick={() => handleClaim(latestWin.id)} />
      )}
    </main>
  );
}
