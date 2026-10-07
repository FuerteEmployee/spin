import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { clearSession, getSite, loadSession } from './services/spinService.js';
import { applyBranding, backgroundStyle } from './theme.js';
import { startAnalytics } from './firebase.js';
import Login from './components/Login.jsx';
import SpinPage from './components/SpinPage.jsx';
import Terms from './components/Terms.jsx';

// Only admins download the admin panel code
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

function isAdminPath() {
  const adminPath = `${import.meta.env.BASE_URL}admin`;
  const path = window.location.pathname.replace(/\/+$/, '');
  return path === adminPath || path.startsWith(`${adminPath}/`);
}

export default function App() {
  if (isAdminPath()) {
    return (
      <Suspense fallback={<p className="page-status">Loading…</p>}>
        <AdminApp />
      </Suspense>
    );
  }
  return <PublicApp />;
}

function PublicApp() {
  const [site, setSite] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [session, setSession] = useState(loadSession);

  const load = useCallback(() => {
    setLoadError('');
    getSite()
      .then((data) => {
        setSite(data);
        applyBranding(data);
        startAnalytics();
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  useEffect(load, [load]);

  const handleLogout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const bg = site && backgroundStyle(site);

  return (
    <div className="app">
      {bg ? (
        <div className="bg-image" style={bg} aria-hidden="true" />
      ) : (
        <div className="bg-orbs" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}

      {!site ? (
        <div className="page-status">
          {loadError ? (
            <>
              <p className="error" role="alert">{loadError}</p>
              <button type="button" className="btn btn-primary" onClick={load}>Try again</button>
            </>
          ) : (
            <p>Loading…</p>
          )}
        </div>
      ) : (
        <>
          {session ? (
            <SpinPage site={site} mobile={session.user.mobile} onLogout={handleLogout} />
          ) : (
            <Login site={site} onLogin={setSession} />
          )}
          <Terms title={site.termsTitle} text={site.terms} />
        </>
      )}
    </div>
  );
}
