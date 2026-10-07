import { useState } from 'react';
import { buildWhatsAppLink } from '../whatsapp.js';
import { WhatsAppIcon } from './icons.jsx';

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// "CONGRATULATIONS! You have unlocked ..." with the code and the WhatsApp button.
// Used in the result popup and, after that, on the page itself.
export default function VoucherCard({ site, mobile, spin, onClaim, titleId, claimRef }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(spin.couponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked; the code is still visible to copy manually
    }
  }

  return (
    <div className="voucher">
      <div className="voucher-icon" aria-hidden="true">{spin.icon}</div>
      <p className="voucher-kicker">{site.winTitle}</p>
      {site.winSubtitle && <p className="voucher-sub">{site.winSubtitle}</p>}
      <h2 id={titleId} className="voucher-title">{spin.label}</h2>
      {spin.description && <p className="voucher-desc">{spin.description}</p>}

      <div className="coupon">
        <div>
          <span className="coupon-label">Voucher code</span>
          <span className="coupon-code">{spin.couponCode}</span>
        </div>
        <button type="button" className="chip" onClick={copyCode}>{copied ? 'Copied!' : 'Copy'}</button>
      </div>

      {spin.redeemedAt ? (
        <p className="voucher-status redeemed">✓ Redeemed on {formatDate(spin.redeemedAt)}</p>
      ) : (
        <>
          <a
            ref={claimRef}
            className="btn btn-whatsapp"
            href={buildWhatsAppLink(site, mobile, spin)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClaim}
          >
            <WhatsAppIcon /> {site.claimButtonText}
          </a>
          {site.claimNote && <p className="voucher-note">{site.claimNote}</p>}
        </>
      )}
      <p className="voucher-date">Won on {formatDate(spin.wonAt)}</p>
    </div>
  );
}
