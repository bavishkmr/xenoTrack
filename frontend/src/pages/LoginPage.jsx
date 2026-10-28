import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { BsShieldLock } from 'react-icons/bs';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'rgba(255,255,255,.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 28, color: '#fff',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,.2)'
          }}>
            <BsShieldLock />
          </div>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, margin: 0 }}>Xenotrack</h1>
          <p style={{ color: 'rgba(255,255,255,.65)', margin: '6px 0 0', fontSize: 14 }}>
            Institute Management System
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: '#fff', borderRadius: 20,
          padding: 36, boxShadow: '0 25px 50px rgba(0,0,0,.25)'
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Welcome back</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 24 }}>
            Sign in to your account to continue
          </p>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address <span className="required">*</span></label>
              <input
                type="email"
                className="form-control"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="admin@xenotrack.local"
                required
                autoFocus
                id="login-email"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <input
                type="password"
                className="form-control"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Enter your password"
                required
                id="login-password"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', fontSize: 15 }}
              disabled={loading}
              id="login-submit"
            >
              {loading ? (
                <><div className="spinner" style={{ width:16, height:16, borderWidth:2 }} /> Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 24, padding: '16px', background: '#F8FAFC', borderRadius: 10, fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Demo Credentials</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>Admin</div>
                <div>admin@xenotrack.com</div>
                <div style={{ color: 'var(--color-primary)', fontWeight: 600 }}>12345xeno</div>
              </div>
              <div>
                <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>Staff</div>
                <div>staff@xenotrack.local</div>
                <div style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Staff@1234</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
