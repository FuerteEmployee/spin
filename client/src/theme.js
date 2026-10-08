export function applyBranding(site) {
  document.title = site.headline ? `${site.brandName} – ${site.headline}` : site.brandName;
  if (!site.images.logo) return;

  // Browser-tab icons are square. A wide logo (emblem + name) turns into an unreadable strip,
  // so it only replaces the built-in icons in client/public when it is roughly square.
  const img = new Image();
  img.onload = () => {
    const ratio = img.naturalWidth / img.naturalHeight;
    if (ratio < 0.8 || ratio > 1.25) return;
    document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((link) => {
      link.href = site.images.logo;
      link.removeAttribute('type');
    });
  };
  img.src = site.images.logo;
}
