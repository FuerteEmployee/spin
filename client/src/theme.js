// CSS variables for the admin-uploaded background. If only one of the two images
// is set, it is used on both mobile and desktop.
export function backgroundStyle({ images, bgOverlay }) {
  const mobile = images.mobileBg || images.desktopBg;
  const desktop = images.desktopBg || images.mobileBg;
  if (!mobile) return null;
  return {
    '--bg-mobile': `url("${mobile}")`,
    '--bg-desktop': `url("${desktop}")`,
    '--bg-overlay': bgOverlay / 100,
  };
}

export function applyBranding(site) {
  document.title = site.headline ? `${site.brandName} – ${site.headline}` : site.brandName;
  if (site.images.logo) {
    document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((link) => {
      link.href = site.images.logo;
      link.removeAttribute('type');
    });
  }
}
