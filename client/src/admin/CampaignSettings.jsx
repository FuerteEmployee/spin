import { buildWhatsAppMessage, MESSAGE_PLACEHOLDERS } from '../whatsapp.js';
import { SaveBar, useSettingsForm } from './useSettingsForm.jsx';

const FIELDS = ['campaignActive', 'closedMessage', 'claimTarget', 'businessWhatsapp', 'whatsappMessage', 'couponPrefix'];

const SAMPLE_SPIN = {
  label: '15% OFF',
  description: 'Get 15% off on your purchase.',
  wonAt: new Date().toISOString(),
};

export default function CampaignSettings({ settings, onSaved }) {
  const form = useSettingsForm(settings, FIELDS, onSaved);
  const { values, set, bind } = form;
  const prefix = (values.couponPrefix || '').toUpperCase();
  const sampleCode = prefix ? `${prefix}-7KQ2MX` : '7KQ2MX';
  const preview = buildWhatsAppMessage(
    { brandName: settings.brandName, whatsappMessage: values.whatsappMessage || '' },
    '9876543210',
    { ...SAMPLE_SPIN, couponCode: sampleCode }
  );

  return (
    <form onSubmit={form.save}>
      <div className="ad-page-head">
        <h1>WhatsApp &amp; Campaign</h1>
      </div>

      <section className="ad-card">
        <h2>Campaign</h2>
        <label className="ad-switch">
          <input type="checkbox" checked={values.campaignActive} onChange={(e) => set('campaignActive', e.target.checked)} />
          <span>
            <strong>{values.campaignActive ? 'Spinning is open' : 'Spinning is closed'}</strong>
            <small>When closed, new users can't spin. People who already won can still log in and see their voucher.</small>
          </span>
        </label>
        <label className="ad-field">
          <span>Message shown when spinning is closed</span>
          <input {...bind('closedMessage')} maxLength={240} />
        </label>
      </section>

      <section className="ad-card">
        <h2>Where the voucher is sent</h2>
        <div className="ad-radio-group">
          <label className="ad-radio">
            <input type="radio" name="claimTarget" checked={values.claimTarget === 'self'} onChange={() => set('claimTarget', 'self')} />
            <span>
              <strong>Customer's own WhatsApp</strong>
              <small>Opens the customer's own chat (“Message yourself”) with the voucher, so they keep it on their phone.</small>
            </span>
          </label>
          <label className="ad-radio">
            <input
              type="radio"
              name="claimTarget"
              checked={values.claimTarget === 'business'}
              onChange={() => set('claimTarget', 'business')}
            />
            <span>
              <strong>Store's WhatsApp number</strong>
              <small>The customer sends the voucher to your number, so you get every claim in WhatsApp.</small>
            </span>
          </label>
        </div>
        {values.claimTarget === 'business' && (
          <label className="ad-field">
            <span>Store WhatsApp number (with country code, e.g. 919876543210)</span>
            <input {...bind('businessWhatsapp')} inputMode="numeric" maxLength={15} required />
          </label>
        )}

        <div className="ad-grid ad-grid-2">
          <label className="ad-field">
            <span>WhatsApp message</span>
            <textarea {...bind('whatsappMessage')} maxLength={1000} rows={10} />
            <small>
              Placeholders:{' '}
              {MESSAGE_PLACEHOLDERS.map((p) => (
                <code key={p} className="ad-code">{p}</code>
              ))}
            </small>
          </label>
          <div className="ad-field">
            <span>Preview</span>
            <div className="ad-wa-preview">{preview}</div>
          </div>
        </div>
      </section>

      <section className="ad-card">
        <h2>Voucher codes</h2>
        <label className="ad-field ad-narrow">
          <span>Code prefix (letters and numbers, up to 8)</span>
          <input
            value={values.couponPrefix}
            onChange={(e) => set('couponPrefix', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
          />
          <small>
            New codes look like <code className="ad-code">{sampleCode}</code>. Codes already given out don't change.
          </small>
        </label>
      </section>

      <SaveBar form={form} />
    </form>
  );
}
