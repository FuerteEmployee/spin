export function applyBranding(site) {
  document.title = site.headline ? `${site.brandName} – ${site.headline}` : site.brandName;
  if (site.images.logo) {
    document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((link) => {
      link.href = site.images.logo;
      link.removeAttribute('type');
    });
  }
}
