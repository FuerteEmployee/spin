import { useCallback, useEffect, useState } from 'react';
import { allowRespin, downloadParticipantsCsv, getParticipants, setRedeemed } from '../services/adminService.js';

const FILTERS = [
  { id: 'all', label: 'All users' },
  { id: 'winners', label: 'Winners' },
  { id: 'unredeemed', label: 'Won, not redeemed' },
  { id: 'redeemed', label: 'Redeemed' },
  { id: 'claimed', label: 'Sent to WhatsApp' },
  { id: 'not-won', label: 'No reward yet' },
];

function formatDate(iso) {
  return iso
    ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '';
}

export default function Participants() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Wait until typing pauses before searching
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(() => {
    setError('');
    getParticipants({ q: search, filter, page })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [search, filter, page]);

  useEffect(load, [load]);

  async function toggleRedeemed(p) {
    setBusyId(p.id);
    try {
      const { redeemedAt } = await setRedeemed(p.win.id, !p.win.redeemedAt);
      setData((d) => ({
        ...d,
        items: d.items.map((item) => (item.id === p.id ? { ...item, win: { ...item.win, redeemedAt } } : item)),
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function respin(p) {
    const what = p.win ? `This deletes voucher ${p.win.couponCode} (${p.win.label}) and lets` : 'This lets';
    if (!window.confirm(`${what} +91 ${p.mobile} spin again. Continue?`)) return;
    setBusyId(p.id);
    try {
      await allowRespin(p.id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      await downloadParticipantsCsv({ q: search, filter });
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="ad-page-head">
        <h1>Users &amp; Winners</h1>
        <button type="button" className="ad-btn" onClick={exportCsv} disabled={exporting}>
          {exporting ? 'Exporting…' : '⬇ Export CSV'}
        </button>
      </div>

      <div className="ad-toolbar">
        <input
          className="ad-input ad-search"
          type="search"
          placeholder="Search mobile number or voucher code"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search mobile number or voucher code"
        />
        <select
          className="ad-input"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter"
        >
          {FILTERS.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </div>

      {error && <p className="ad-error" role="alert">{error}</p>}

      <section className="ad-card ad-card-flush">
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Mobile</th>
                <th>Reward</th>
                <th>Voucher code</th>
                <th>Won at</th>
                <th>WhatsApp</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {!data && (
                <tr>
                  <td colSpan={7} className="ad-empty">Loading…</td>
                </tr>
              )}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="ad-empty">No one matches this search yet.</td>
                </tr>
              )}
              {data?.items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>+91 {p.mobile}</strong>
                    <span className="ad-sub">First login {formatDate(p.joinedAt)}</span>
                  </td>
                  {p.win ? (
                    <>
                      <td>{p.win.icon} {p.win.label}</td>
                      <td><code className="ad-code">{p.win.couponCode}</code></td>
                      <td>{formatDate(p.win.wonAt)}</td>
                      <td>{p.win.claimedAt ? <span className="ad-pill ad-pill-green">Sent</span> : <span className="ad-muted">–</span>}</td>
                      <td>
                        {p.win.redeemedAt ? (
                          <span className="ad-pill ad-pill-green" title={formatDate(p.win.redeemedAt)}>Redeemed</span>
                        ) : (
                          <span className="ad-pill ad-pill-amber">Not redeemed</span>
                        )}
                      </td>
                    </>
                  ) : (
                    <td colSpan={5} className="ad-muted">
                      {p.spinCount > 0 ? `Spun ${p.spinCount}×, no reward` : 'Logged in, has not spun'}
                    </td>
                  )}
                  <td className="ad-actions">
                    {p.win && (
                      <button type="button" className="ad-btn ad-btn-sm" onClick={() => toggleRedeemed(p)} disabled={busyId === p.id}>
                        {p.win.redeemedAt ? 'Undo redeem' : 'Mark redeemed'}
                      </button>
                    )}
                    {p.spinCount > 0 && (
                      <button type="button" className="ad-btn ad-btn-sm ad-btn-danger" onClick={() => respin(p)} disabled={busyId === p.id}>
                        Allow re-spin
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {data && data.pages > 1 && (
        <div className="ad-pager">
          <button type="button" className="ad-btn ad-btn-sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>← Previous</button>
          <span>
            Page {data.page} of {data.pages} · {data.total.toLocaleString('en-IN')} users
          </span>
          <button type="button" className="ad-btn ad-btn-sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.pages}>Next →</button>
        </div>
      )}
      {data && data.pages <= 1 && <p className="ad-muted ad-count">{data.total.toLocaleString('en-IN')} users</p>}
    </>
  );
}
