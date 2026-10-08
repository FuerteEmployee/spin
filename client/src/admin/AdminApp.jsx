import { useCallback, useEffect, useState } from 'react';
import { ADMIN_LOGOUT_EVENT, clearAdminToken, getSettings, loadAdminToken } from '../services/adminService.js';
import AdminLogin from './AdminLogin.jsx';
import Dashboard from './Dashboard.jsx';
import Participants from './Participants.jsx';
import RewardsEditor from './RewardsEditor.jsx';
import ContentSettings from './ContentSettings.jsx';
import CampaignSettings from './CampaignSettings.jsx';
import Appearance from './Appearance.jsx';
import './admin.css';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'participants', label: 'Users & Winners', icon: '👥' },
  { id: 'rewards', label: 'Rewards & Wheel', icon: '🎡' },
  { id: 'content', label: 'Texts & T&C', icon: '📝' },
  { id: 'appearance', label: 'Backgrounds & Logo', icon: '🖼️' },
  { id: 'campaign', label: 'WhatsApp & Campaign', icon: '⚙️' },
];

function tabFromHash() {
  const id = window.location.hash.slice(1);
  return TABS.some((t) => t.id === id) ? id : 'dashboard';
}

export default function AdminApp() {
  const [token, setToken] = useState(loadAdminToken);
  const [tab, setTab] = useState(tabFromHash);
  // Site settings are shared by the texts, appearance and campaign tabs
  const [settings, setSettings] = useState(null);
  const [settingsError, setSettingsError] = useState('');
  // Sidebar drawer on small screens
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    document.body.classList.add('admin-body');
    return () => document.body.classList.remove('admin-body');
  }, []);

  useEffect(() => {
    document.title = `Admin – ${settings?.brandName || 'Spin & Win'}`;
  }, [settings?.brandName]);

  useEffect(() => {
    const onLogout = () => setToken(null);
    const onHash = () => setTab(tabFromHash());
    window.addEventListener(ADMIN_LOGOUT_EVENT, onLogout);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener(ADMIN_LOGOUT_EVENT, onLogout);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  const loadSettings = useCallback(() => {
    setSettingsError('');
    getSettings()
      .then(setSettings)
      .catch((err) => setSettingsError(err.message));
  }, []);

  useEffect(() => {
    if (token) loadSettings();
  }, [token, loadSettings]);

  function logout() {
    clearAdminToken();
    setToken(null);
    setSettings(null);
  }

  if (!token) return <AdminLogin onLogin={setToken} />;

  const needsSettings = ['content', 'appearance', 'campaign'].includes(tab);
  const siteUrl = import.meta.env.BASE_URL;

  const current = TABS.find((t) => t.id === tab);

  return (
    <div className={`ad-shell ${menuOpen ? 'is-menu-open' : ''}`}>
      <aside className="ad-sidebar" id="ad-sidebar" aria-label="Admin menu">
        <div className="ad-sidebar-brand">
          {settings?.images.logo ? (
            <img src={settings.images.logo} alt="" />
          ) : (
            <span className="ad-sidebar-logo" aria-hidden="true">🎡</span>
          )}
          <div>
            <strong>{settings?.brandName || 'Spin & Win'}</strong>
            <span>Admin panel</span>
          </div>
        </div>

        <nav className="ad-nav">
          {TABS.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className={`ad-nav-item ${tab === t.id ? 'is-active' : ''}`}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {t.label}
            </a>
          ))}
        </nav>

        <div className="ad-sidebar-foot">
          <a className="ad-nav-item" href={siteUrl} target="_blank" rel="noopener noreferrer">
            View live site
          </a>
          <button type="button" className="ad-nav-item" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="ad-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />

      <div className="ad-content">
        <header className="ad-topbar">
          <button
            type="button"
            className="ad-menu-btn"
            onClick={() => setMenuOpen(true)}
            aria-controls="ad-sidebar"
            aria-expanded={menuOpen}
            aria-label="Open menu"
          >
            ☰
          </button>
          <strong>{current.icon} {current.label}</strong>
        </header>

        <main className="ad-main">
          {needsSettings && !settings ? (
            settingsError ? (
              <div className="ad-card">
                <p className="ad-error">{settingsError}</p>
                <button type="button" className="ad-btn" onClick={loadSettings}>Try again</button>
              </div>
            ) : (
              <p className="ad-muted">Loading…</p>
            )
          ) : (
            <>
              {tab === 'dashboard' && <Dashboard />}
              {tab === 'participants' && <Participants />}
              {tab === 'rewards' && <RewardsEditor />}
              {tab === 'content' && <ContentSettings settings={settings} onSaved={setSettings} />}
              {tab === 'appearance' && <Appearance settings={settings} onSaved={setSettings} />}
              {tab === 'campaign' && <CampaignSettings settings={settings} onSaved={setSettings} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
