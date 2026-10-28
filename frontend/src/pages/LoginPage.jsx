import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { BsArrowRight, BsCheck, BsShieldCheck } from 'react-icons/bs';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fillCredentials = (email, password) => {
    setForm({ email, password });
    setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Signed in successfully');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your connection or credentials.');
      toast.error('Authentication failed');
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
      backgroundColor: '#090D16',
      backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(30, 41, 59, 0.5) 0%, rgba(9, 13, 22, 1) 75%)',
      padding: '24px',
      color: '#0F172A'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: '20px',
            fontWeight: 800,
            marginBottom: '16px',
            letterSpacing: '-0.5px',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)'
          }}>
            X
          </div>
          <h1 style={{
            color: '#F8FAFC',
            fontSize: '22px',
            fontWeight: 700,
            margin: '0 0 6px 0',
            letterSpacing: '-0.02em'
          }}>
            Xenotrack
          </h1>
          <p style={{
            color: '#94A3B8',
            margin: 0,
            fontSize: '13px',
            fontWeight: 400
          }}>
            Institute & Academy Operations System
          </p>
        </div>

        {/* Login Surface */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '28px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px 0' }}>
              Sign in to workspace
            </h2>
            <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>
              Enter your institute credentials below
            </p>
          </div>

          {error && (
            <div style={{
              marginBottom: '18px',
              padding: '10px 14px',
              borderRadius: '6px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              fontSize: '13px',
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <span style={{ fontWeight: 700 }}>•</span>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Email Address
              </label>
              <input
                type="email"
                className="form-control"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="admin@xenotrack.com"
                required
                autoFocus
                id="login-email"
                style={{
                  height: '40px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                  padding: '0 12px',
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  width: '100%'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  margin: 0
                }}>
                  Password
                </label>
              </div>
              <input
                type="password"
                className="form-control"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••••••"
                required
                id="login-password"
                style={{
                  height: '40px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                  padding: '0 12px',
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  width: '100%'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              id="login-submit"
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '6px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.15s ease',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
            >
              {loading ? (
                <>Signing in...</>
              ) : (
                <>Sign In <BsArrowRight size={14} /></>
              )}
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div style={{
            marginTop: '22px',
            paddingTop: '16px',
            borderTop: '1px solid #F1F5F9'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px'
            }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Quick Demo Access
              </span>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>Click to auto-fill</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => fillCredentials('admin@xenotrack.com', '12345xeno')}
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#0F172A' }}>Admin</div>
                <div style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  admin@xenotrack.com
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('staff@xenotrack.local', 'Staff@1234')}
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#0F172A' }}>Staff</div>
                <div style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  staff@xenotrack.local
                </div>
              </button>
            </div>
          </div>

        </div>

        {/* Security Subline */}
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          color: '#64748B',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}>
          <BsShieldCheck size={14} color="#10B981" />
          <span>Role-Based Access Control & Encrypted Sessions</span>
        </div>

      </div>
    </div>
  );
}
