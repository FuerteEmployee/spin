import { termsItems } from '../components/Terms.jsx';
import { SaveBar, useSettingsForm } from './useSettingsForm.jsx';

const FIELDS = [
  'brandName',
  'headline',
  'subheadline',
  'spinTitle',
  'spinSubtitle',
  'winTitle',
  'winSubtitle',
  'claimButtonText',
  'claimNote',
  'termsTitle',
  'terms',
];

function Field({ label, hint, children }) {
  return (
    <label className="ad-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export default function ContentSettings({ settings, onSaved }) {
  const form = useSettingsForm(settings, FIELDS, onSaved);
  const { bind } = form;
  const terms = termsItems(form.values.terms);

  return (
    <form onSubmit={form.save}>
      <div className="ad-page-head">
        <h1>Texts &amp; T&amp;C</h1>
      </div>

      <section className="ad-card">
        <h2>Login page</h2>
        <div className="ad-stack">
          <Field label="Brand name" hint="Shown above the headline, in the top bar and in the WhatsApp message.">
            <input {...bind('brandName')} maxLength={60} required />
          </Field>
          <Field label="Headline">
            <input {...bind('headline')} maxLength={100} required />
          </Field>
          <Field label="Text under the headline">
            <textarea {...bind('subheadline')} maxLength={240} rows={2} />
          </Field>
        </div>
      </section>

      <section className="ad-card">
        <h2>Spin page</h2>
        <div className="ad-stack">
          <Field label="Title above the wheel">
            <input {...bind('spinTitle')} maxLength={80} />
          </Field>
          <Field label="Text above the wheel">
            <textarea {...bind('spinSubtitle')} maxLength={240} rows={2} />
          </Field>
        </div>
      </section>

      <section className="ad-card">
        <h2>Win screen</h2>
        <div className="ad-grid ad-grid-2">
          <Field label="Win title">
            <input {...bind('winTitle')} maxLength={60} required />
          </Field>
          <Field label="Line before the reward name">
            <input {...bind('winSubtitle')} maxLength={100} />
          </Field>
          <Field label="WhatsApp button text">
            <input {...bind('claimButtonText')} maxLength={40} required />
          </Field>
          <Field label="Note under the button">
            <input {...bind('claimNote')} maxLength={240} />
          </Field>
        </div>
        <div className="ad-win-preview" aria-label="Preview">
          <span className="ad-win-preview-title">{form.values.winTitle}</span>
          <span>{form.values.winSubtitle}</span>
          <strong>15% OFF</strong>
          <span className="ad-win-preview-btn">{form.values.claimButtonText}</span>
          <small>{form.values.claimNote}</small>
        </div>
      </section>

      <section className="ad-card">
        <h2>Terms &amp; Conditions</h2>
        <p className="ad-muted">Shown at the bottom of every page. Write one point per line; they are numbered automatically.</p>
        <div className="ad-grid ad-grid-2">
          <div className="ad-stack">
            <Field label="Heading">
              <input {...bind('termsTitle')} maxLength={60} />
            </Field>
            <Field label="Points (one per line)">
              <textarea {...bind('terms')} maxLength={5000} rows={12} />
            </Field>
          </div>
          <div className="ad-terms-preview">
            <strong>{form.values.termsTitle || 'Terms & Conditions'}</strong>
            {terms.length ? (
              <ol>
                {terms.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            ) : (
              <p className="ad-muted">No terms. The section is hidden on the site.</p>
            )}
          </div>
        </div>
      </section>

      <SaveBar form={form} />
    </form>
  );
}
