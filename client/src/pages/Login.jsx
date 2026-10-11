import { useState } from 'react';
import { api, setToken } from '../api.js';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setLoading(true);
    try {
      const data = await api.login(email.trim(), password);
      setToken(data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card airmail login" onSubmit={submit} noValidate>
        <h1>Sign in to Bulk Mail</h1>
        <p className="muted">Admin access only.</p>

        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && <div className="alert error" role="alert">{error}</div>}

        <button className="btn primary" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
