import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { ws } from '../services/ws.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      setAuth(data.user, data.accessToken);
      ws.connect();
      navigate('/new', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Invalid email or password');
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

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your account</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handle}>
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
              type="password" required autoComplete="current-password"
              className="auth-input"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <><div className="spinner" /> Signing in...</> : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <Link to="/register" className="auth-switch-link">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
