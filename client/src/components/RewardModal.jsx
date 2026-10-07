import { useEffect, useRef, useState } from 'react';
import { WhatsAppIcon } from './WhatsAppFab.jsx';

export default function RewardModal({ result, whatsappLink, onClaim, onSpinAgain, onClose }) {
  const primaryRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    primaryRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(result.couponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked; the code is still visible to copy manually
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal ${result.isWin ? 'modal-win' : 'modal-retry'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close">×</button>

        <div className="modal-icon" aria-hidden="true">{result.icon}</div>

        {result.isWin ? (
          <>
            <p className="modal-kicker">Congratulations! You won</p>
            <h2 id="reward-title" className="modal-title">{result.label}</h2>
            <p className="modal-desc">{result.description}</p>

            <div className="coupon">
              <div>
                <span className="coupon-label">Coupon code</span>
                <span className="coupon-code">{result.couponCode}</span>
              </div>
              <button type="button" className="chip" onClick={copyCode}>{copied ? 'Copied!' : 'Copy'}</button>
            </div>

            <a
              ref={primaryRef}
              className="btn btn-whatsapp"
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClaim}
            >
              <WhatsAppIcon /> Claim on WhatsApp
            </a>
            <p className="modal-note">Send us the pre-filled message on WhatsApp to claim your reward.</p>
            <button type="button" className="link modal-spin-again" onClick={onSpinAgain}>
              Spin again
            </button>
          </>
        ) : (
          <>
            <h2 id="reward-title" className="modal-title">Oops, Try Again!</h2>
            <p className="modal-desc">{result.description}</p>
            <button ref={primaryRef} type="button" className="btn btn-primary" onClick={onSpinAgain}>
              Spin Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
