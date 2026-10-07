// Admin-edited T&C: one point per line. Any "1." / "-" / "•" the admin typed is dropped
// because the list numbers itself.
export function termsItems(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.replace(/^\s*(\d+\s*[.)]|[-*•])\s*/, '').trim())
    .filter(Boolean);
}

export default function Terms({ title, text }) {
  const items = termsItems(text);
  if (items.length === 0) return null;

  return (
    <section className="terms" aria-labelledby="terms-title">
      <h2 id="terms-title">{title || 'Terms & Conditions'}</h2>
      <ol>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>
    </section>
  );
}
