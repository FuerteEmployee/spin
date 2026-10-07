import { useRef, useState } from 'react';
import { removeImage, uploadImage } from '../services/adminService.js';
import { backgroundStyle } from '../theme.js';
import { prepareImage } from './imageResize.js';
import { SaveBar, useSettingsForm } from './useSettingsForm.jsx';

const SLOTS = [
  {
    id: 'desktopBg',
    title: 'Desktop background',
    hint: 'Landscape, about 1920 × 1080 px. Used on screens 768 px and wider.',
    maxSize: 2400,
  },
  {
    id: 'mobileBg',
    title: 'Mobile background',
    hint: 'Portrait, about 1080 × 1920 px. Most customers scanning the QR code will see this one.',
    maxSize: 2000,
  },
  {
    id: 'logo',
    title: 'Logo',
    hint: 'PNG with a transparent background works best. Also used as the browser tab icon.',
    maxSize: 600,
    keepAlpha: true,
  },
];

function ImageSlot({ slot, url, onChanged }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(file) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const blob = await prepareImage(file, slot);
      onChanged(await uploadImage(slot.id, blob));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      input.current.value = '';
    }
  }

  async function remove() {
    if (!window.confirm(`Remove the ${slot.title.toLowerCase()}?`)) return;
    setBusy(true);
    setError('');
    try {
      onChanged(await removeImage(slot.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ad-card ad-image-slot">
      <h2>{slot.title}</h2>
      <p className="ad-muted">{slot.hint}</p>
      <div className={`ad-image-frame ad-frame-${slot.id}`}>
        {url ? <img src={url} alt={slot.title} /> : <span className="ad-muted">No image</span>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => upload(e.target.files[0])}
      />
      <div className="ad-row">
        <button type="button" className="ad-btn ad-btn-primary" onClick={() => input.current.click()} disabled={busy}>
          {busy ? 'Working…' : url ? 'Replace' : 'Upload'}
        </button>
        {url && (
          <button type="button" className="ad-btn ad-btn-danger" onClick={remove} disabled={busy}>Remove</button>
        )}
      </div>
      {error && <p className="ad-error" role="alert">{error}</p>}
    </section>
  );
}

export default function Appearance({ settings, onSaved }) {
  const form = useSettingsForm(settings, ['bgOverlay'], onSaved);
  const overlay = Number(form.values.bgOverlay);
  const images = settings.images;
  const mobileStyle = backgroundStyle({ images: { mobileBg: images.mobileBg || images.desktopBg }, bgOverlay: overlay });
  const desktopStyle = backgroundStyle({ images: { mobileBg: images.desktopBg || images.mobileBg }, bgOverlay: overlay });

  return (
    <>
      <div className="ad-page-head">
        <h1>Backgrounds &amp; Logo</h1>
      </div>
      <p className="ad-muted ad-intro">
        Uploads go live immediately. If you upload only one background, it's used on both mobile and desktop. Large photos
        are shrunk automatically before uploading.
      </p>

      <div className="ad-image-grid">
        {SLOTS.map((slot) => (
          <ImageSlot key={slot.id} slot={slot} url={images[slot.id]} onChanged={onSaved} />
        ))}
      </div>

      <form className="ad-card" onSubmit={form.save}>
        <h2>Background darkness</h2>
        <p className="ad-muted">A dark layer over the background keeps the text readable. Increase it for bright or busy photos.</p>
        <label className="ad-range">
          <input
            type="range"
            min="0"
            max="90"
            step="5"
            value={overlay}
            onChange={(e) => form.set('bgOverlay', Number(e.target.value))}
          />
          <output>{overlay}%</output>
        </label>

        {(images.mobileBg || images.desktopBg) && (
          <div className="ad-bg-previews">
            <figure>
              <div className="ad-bg-preview ad-bg-preview-mobile">
                <div className="bg-image" style={mobileStyle} />
                <span>Scan &amp; Win</span>
              </div>
              <figcaption>Mobile</figcaption>
            </figure>
            <figure>
              <div className="ad-bg-preview ad-bg-preview-desktop">
                <div className="bg-image" style={desktopStyle} />
                <span>Scan &amp; Win</span>
              </div>
              <figcaption>Desktop</figcaption>
            </figure>
          </div>
        )}

        <SaveBar form={form} />
      </form>
    </>
  );
}
