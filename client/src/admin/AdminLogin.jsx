import { useState } from 'react';
import { adminLogin } from '../services/adminService.js';

export default function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      onLogin(await adminLogin(username.trim(), password));
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="ad-login">
      <form className="ad-card ad-login-card" onSubmit={submit}>
        <div className="ad-login-icon" aria-hidden="true">🎡</div>
        <h1>Admin login</h1>
        <p className="ad-muted">Manage the wheel, texts, backgrounds and winners.</p>

        <label className="ad-field">
          <span>Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </label>
        <label className="ad-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
          />
        </label>

        {error && <p className="ad-error" role="alert">{error}</p>}

        <button type="submit" className="ad-btn ad-btn-primary ad-btn-block" disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  );
}
