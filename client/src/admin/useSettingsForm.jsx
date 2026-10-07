import { useState } from 'react';
import { saveSettings } from '../services/adminService.js';

// Local form state for a subset of the site settings. Only these fields are sent on save.
export function useSettingsForm(settings, fields, onSaved) {
  const pick = (source) => Object.fromEntries(fields.map((f) => [f, source[f]]));
  const [values, setValues] = useState(() => pick(settings));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const dirty = fields.some((f) => values[f] !== settings[f]);

  function set(field, value) {
    setValues((v) => ({ ...v, [field]: value }));
    setMessage(null);
  }

  async function save(event) {
    event?.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const saved = await saveSettings(values);
      onSaved(saved);
      setValues(pick(saved));
      setMessage({ type: 'success', text: 'Saved. The live site is updated.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  // Text inputs bind with {...bind('field')}
  const bind = (field) => ({ value: values[field] ?? '', onChange: (e) => set(field, e.target.value) });

  return { values, set, bind, save, saving, message, dirty };
}

export function SaveBar({ form }) {
  return (
    <div className="ad-savebar">
      {form.message && (
        <p className={form.message.type === 'error' ? 'ad-error' : 'ad-success'} role="status">{form.message.text}</p>
      )}
      {form.dirty && !form.message && <p className="ad-warning">Unsaved changes</p>}
      <button type="submit" className="ad-btn ad-btn-primary" disabled={!form.dirty || form.saving}>
        {form.saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}
