import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, register } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth  = useAuthStore(s => s.setAuth);
  const [form, setForm]     = useState({ email: '', password: '', username: '' });
  const [error, setError]   = useState('');
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
      navigate('/new', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try a different email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-glow" />
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">X</div>
          <span className="auth-brand-name">Xro Agent</span>
        </div>

        <div className="auth-heading">
          <h1 className="auth-title">Create account</h1>
          <p className="auth-sub">Start using Xro Agent today</p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handle}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="username">Username</label>
            <input
              id="username" type="text" required autoComplete="username"
              className="auth-input"
              placeholder="yourname"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email</label>
            <input
              id="email" type="email" required autoComplete="email"
              className="auth-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Password</label>
            <input
              id="password" type="password" required minLength={8} autoComplete="new-password"
              className="auth-input"
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? (
              <><span className="auth-spinner" /> Creating account…</>
            ) : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-footer-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
