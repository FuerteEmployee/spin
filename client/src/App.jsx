import { useState } from 'react';
import { clearSession, loadSession } from './services/spinService.js';
import Login from './components/Login.jsx';
import SpinPage from './components/SpinPage.jsx';

export default function App() {
  const [session, setSession] = useState(loadSession);

  function handleLogout() {
    clearSession();
    setSession(null);
  }

  return (
    <div className="app">
      <div className="bg-orbs" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      {session ? (
        <SpinPage mobile={session.user.mobile} onLogout={handleLogout} />
      ) : (
        <Login onLogin={setSession} />
      )}
    </div>
  );
}
