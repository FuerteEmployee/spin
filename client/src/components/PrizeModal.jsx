import { useEffect, useRef } from 'react';
import VoucherCard from './VoucherCard.jsx';

export default function PrizeModal({ site, mobile, result, onClaim, onSpinAgain, onClose }) {
  const primaryRef = useRef(null);

  useEffect(() => {
    primaryRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal ${result.isWin ? 'modal-win' : 'modal-retry'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prize-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close">×</button>

        {result.isWin ? (
          <VoucherCard site={site} mobile={mobile} spin={result} onClaim={onClaim} titleId="prize-title" claimRef={primaryRef} />
        ) : (
          <div className="voucher">
            <div className="voucher-icon" aria-hidden="true">{result.icon}</div>
            <h2 id="prize-title" className="voucher-title">Oops, Try Again!</h2>
            {result.description && <p className="voucher-desc">{result.description}</p>}
            <button ref={primaryRef} type="button" className="btn btn-primary" onClick={onSpinAgain}>
              Spin Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
