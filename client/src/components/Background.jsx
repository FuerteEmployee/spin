// Full-screen background from the admin-uploaded images. A <picture> lets the browser choose
// the mobile or desktop image itself, which works on more phones than CSS-variable tricks.
// If only one image is set it's used for both.
export default function Background({ mobile, desktop, overlay, className = '' }) {
  const small = mobile || desktop;
  const large = desktop || mobile;
  if (!small) return null;

  return (
    <div className={`bg-image ${className}`} aria-hidden="true">
      <picture>
        {large !== small && <source media="(min-width: 768px)" srcSet={large} />}
        <img src={small} alt="" decoding="async" />
      </picture>
      <span className="bg-image-overlay" style={{ opacity: overlay / 100 }} />
    </div>
  );
}
