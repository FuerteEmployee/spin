import { useEffect, useState } from 'react';
import { getRewards, saveRewards } from '../services/adminService.js';
import SpinWheel from '../components/SpinWheel.jsx';

let nextKey = 1;

function toRow(reward) {
  const [line1 = '', line2 = ''] = (reward.wheelLabel || '').split('\n');
  return {
    key: nextKey++,
    id: reward.id || null,
    label: reward.label || '',
    line1,
    line2,
    icon: reward.icon || '🎁',
    description: reward.description || '',
    color: reward.color || '#7c3aed',
    textColor: reward.textColor || '#ffffff',
    weight: reward.weight ?? 10,
    isWin: reward.isWin !== false,
    showNote: reward.showNote === true,
  };
}

function toReward(row) {
  return {
    id: row.id,
    label: row.label,
    wheelLabel: [row.line1, row.line2].map((l) => l.trim()).filter(Boolean).join('\n'),
    icon: row.icon,
    description: row.description,
    color: row.color,
    textColor: row.textColor,
    weight: Number(row.weight) || 0,
    isWin: row.isWin,
    showNote: row.showNote,
  };
}

export default function RewardsEditor() {
  const [rows, setRows] = useState(null);
  const [defaults, setDefaults] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  function load() {
    setMessage(null);
    getRewards()
      .then((data) => {
        setRows(data.rewards.map(toRow));
        setDefaults(data.defaults);
        setDirty(false);
      })
      .catch((err) => setMessage({ type: 'error', text: err.message }));
  }

  useEffect(load, []);

  // Warn before leaving the page with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  function change(next) {
    setRows(next);
    setDirty(true);
    setMessage(null);
  }

  const update = (key, field, value) => change(rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  const remove = (key) => change(rows.filter((r) => r.key !== key));
  function move(index, delta) {
    const next = [...rows];
    const [row] = next.splice(index, 1);
    next.splice(index + delta, 0, row);
    change(next);
  }
  function add() {
    change([...rows, toRow({ label: 'New reward', wheelLabel: 'NEW\nREWARD', icon: '🎁', color: '#0ea5e9', weight: 10 })]);
  }
  function loadDefaults() {
    if (!window.confirm('Replace the wheel below with the Navratri default rewards? Nothing is saved until you click Save.')) return;
    change(defaults.map(toRow));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const data = await saveRewards(rows.map(toReward));
      setRows(data.rewards.map(toRow));
      setDirty(false);
      setMessage({ type: 'success', text: 'Saved. The live wheel is updated.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (!rows) {
    return message ? <p className="ad-error">{message.text}</p> : <p className="ad-muted">Loading…</p>;
  }

  const totalWeight = rows.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  const preview = rows.map((r) => ({ ...toReward(r), id: String(r.key) }));

  return (
    <>
      <div className="ad-page-head">
        <h1>Rewards &amp; Wheel</h1>
        <div className="ad-head-actions">
          <button type="button" className="ad-btn" onClick={loadDefaults}>Load Navratri defaults</button>
          {dirty && <button type="button" className="ad-btn" onClick={load} disabled={saving}>Discard changes</button>}
          <button type="button" className="ad-btn ad-btn-primary" onClick={save} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {message && <p className={message.type === 'error' ? 'ad-error' : 'ad-success'} role="status">{message.text}</p>}
      {dirty && !message && <p className="ad-warning">You have unsaved changes.</p>}

      <div className="ad-rewards-layout">
        <div className="ad-reward-list">
          {rows.map((row, i) => {
            const chance = totalWeight ? ((Number(row.weight) || 0) / totalWeight) * 100 : 0;
            return (
              <section key={row.key} className="ad-card ad-reward">
                <div className="ad-reward-head">
                  <span className="ad-swatch ad-swatch-lg" style={{ background: row.color, color: row.textColor }}>
                    {i + 1}
                  </span>
                  <strong>{row.icon} {row.label || 'Untitled'}</strong>
                  <span className="ad-chance">{chance.toFixed(1)}%</span>
                  <div className="ad-reward-tools">
                    <button type="button" className="ad-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                    <button type="button" className="ad-icon-btn" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">↓</button>
                    <button type="button" className="ad-icon-btn ad-danger" onClick={() => remove(row.key)} disabled={rows.length <= 2} aria-label="Remove reward">✕</button>
                  </div>
                </div>

                <div className="ad-grid">
                  <label className="ad-field ad-span-2">
                    <span>Reward name (shown on the voucher)</span>
                    <input value={row.label} maxLength={60} onChange={(e) => update(row.key, 'label', e.target.value)} />
                  </label>
                  <label className="ad-field">
                    <span>Icon / emoji</span>
                    <input value={row.icon} maxLength={16} onChange={(e) => update(row.key, 'icon', e.target.value)} />
                  </label>
                  <label className="ad-field">
                    <span>Chance (weight)</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={row.weight}
                      onChange={(e) => update(row.key, 'weight', e.target.value)}
                    />
                  </label>
                  <label className="ad-field">
                    <span>Wheel text, line 1</span>
                    <input value={row.line1} maxLength={14} onChange={(e) => update(row.key, 'line1', e.target.value)} />
                  </label>
                  <label className="ad-field">
                    <span>Wheel text, line 2</span>
                    <input value={row.line2} maxLength={14} onChange={(e) => update(row.key, 'line2', e.target.value)} />
                  </label>
                  <label className="ad-field">
                    <span>Segment colour</span>
                    <input type="color" value={row.color} onChange={(e) => update(row.key, 'color', e.target.value)} />
                  </label>
                  <label className="ad-field">
                    <span>Text colour</span>
                    <input type="color" value={row.textColor} onChange={(e) => update(row.key, 'textColor', e.target.value)} />
                  </label>
                  <label className="ad-field ad-span-4">
                    <span>Description / condition (e.g. “Valid on a minimum purchase of ₹5,000.”)</span>
                    <input value={row.description} maxLength={200} onChange={(e) => update(row.key, 'description', e.target.value)} />
                  </label>
                  <label className="ad-check ad-span-4">
                    <input type="checkbox" checked={row.isWin} onChange={(e) => update(row.key, 'isWin', e.target.checked)} />
                    Gives a voucher. Untick for a “Try Again” segment, which lets the user spin again.
                  </label>
                  <label className="ad-check ad-span-4">
                    <input type="checkbox" checked={row.showNote} onChange={(e) => update(row.key, 'showNote', e.target.checked)} />
                    Show the description under the spin button (e.g. a minimum purchase condition)
                  </label>
                </div>
              </section>
            );
          })}

          <button type="button" className="ad-btn ad-btn-block" onClick={add} disabled={rows.length >= 12}>
            + Add reward
          </button>
        </div>

        <aside className="ad-card ad-wheel-preview">
          <h2>Preview</h2>
          <div className="ad-wheel-stage">
            <SpinWheel rewards={preview} rotation={0} spinning={false} duration={0} onSpinEnd={() => {}} onSpinClick={() => {}} canSpin={false} />
          </div>
          <p className="ad-muted">
            Chance is relative: a reward with weight 30 is won three times as often as one with weight 10. The
            percentages next to each reward are the real odds.
          </p>
        </aside>
      </div>
    </>
  );
}
