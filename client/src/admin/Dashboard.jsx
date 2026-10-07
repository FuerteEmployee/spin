import { useCallback, useEffect, useState } from 'react';
import { getStats } from '../services/adminService.js';

function Stat({ label, value, hint, href }) {
  const body = (
    <>
      <span className="ad-stat-value">{value.toLocaleString('en-IN')}</span>
      <span className="ad-stat-label">{label}</span>
      {hint && <span className="ad-stat-hint">{hint}</span>}
    </>
  );
  return href ? (
    <a className="ad-stat" href={href}>{body}</a>
  ) : (
    <div className="ad-stat">{body}</div>
  );
}

function percent(part, total) {
  return total ? `${Math.round((part / total) * 100)}%` : '–';
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    getStats()
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  if (error) {
    return (
      <div className="ad-card">
        <p className="ad-error">{error}</p>
        <button type="button" className="ad-btn" onClick={load}>Try again</button>
      </div>
    );
  }
  if (!stats) return <p className="ad-muted">Loading…</p>;

  const totalWon = stats.breakdown.reduce((sum, r) => sum + r.won, 0);

  return (
    <>
      <div className="ad-page-head">
        <h1>Dashboard</h1>
        <button type="button" className="ad-btn" onClick={load}>↻ Refresh</button>
      </div>

      <div className="ad-stats">
        <Stat label="Users logged in" value={stats.users} href="#participants" />
        <Stat label="Winners" value={stats.winners} hint={`${stats.today} today`} />
        <Stat label="Sent to WhatsApp" value={stats.claimed} hint={`${percent(stats.claimed, stats.winners)} of winners`} />
        <Stat label="Redeemed at store" value={stats.redeemed} hint={`${percent(stats.redeemed, stats.winners)} of winners`} />
        <Stat label="Logged in, no reward yet" value={stats.notWon} />
      </div>

      <section className="ad-card">
        <h2>Rewards won</h2>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Reward</th>
                <th className="num">Set chance</th>
                <th className="num">Times won</th>
                <th className="num">Share of wins</th>
              </tr>
            </thead>
            <tbody>
              {stats.breakdown.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="ad-swatch" style={{ background: r.color }} aria-hidden="true" />
                    {r.icon} {r.label}
                    {r.removed && <span className="ad-pill">removed</span>}
                    {!r.isWin && <span className="ad-pill">no voucher</span>}
                  </td>
                  <td className="num">{r.chance == null ? '–' : `${r.chance.toFixed(1)}%`}</td>
                  <td className="num">{r.won}</td>
                  <td className="num">{percent(r.won, totalWon)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
