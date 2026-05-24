import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, register } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { ws } from '../services/ws.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username.trim()) { setError('Username is required'); return; }
    setLoading(true);
    try {
      await register(form.email, form.password, form.username);
      const data = await login(form.email, form.password);
      setAuth(data.user, data.accessToken);
      ws.connect();
      navigate('/new', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">X</div>
          <span className="auth-logo-name">Xro Agent</span>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Start using Xro Agent today</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handle}>
          <div className="auth-field">
            <label className="auth-label">Username</label>
            <input
              type="text" required autoComplete="username"
              className="auth-input"
              placeholder="yourname"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              type="email" required autoComplete="email"
              className="auth-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              type="password" required minLength={8} autoComplete="new-password"
              className="auth-input"
              placeholder="Min 8 characters"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <><div className="spinner" /> Creating account...</> : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-switch-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
