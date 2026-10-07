// Placeholders the admin can use in the WhatsApp message
export const MESSAGE_PLACEHOLDERS = ['{brand}', '{reward}', '{description}', '{code}', '{mobile}', '{date}'];

// "self" sends the voucher to the customer's own WhatsApp chat, "business" to the store's number
export function claimNumber(site, mobile) {
  return site.claimTarget === 'business' && site.businessWhatsapp ? site.businessWhatsapp : `91${mobile}`;
}

export function buildWhatsAppMessage(site, mobile, spin) {
  const values = {
    brand: site.brandName,
    reward: spin.label,
    description: spin.description || '',
    code: spin.couponCode || '',
    mobile,
    date: new Date(spin.wonAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  };
  return site.whatsappMessage.replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
}

export function buildWhatsAppLink(site, mobile, spin) {
  const message = buildWhatsAppMessage(site, mobile, spin);
  return `https://wa.me/${claimNumber(site, mobile)}?text=${encodeURIComponent(message)}`;
}
