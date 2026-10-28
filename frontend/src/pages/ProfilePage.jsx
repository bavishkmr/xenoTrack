import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services';
import { BsPersonCircle, BsShieldLock } from 'react-icons/bs';

export default function ProfilePage() {
  const { user } = useAuth();
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async e => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error('New password and confirm password do not match'); return;
    }
    if (pwdForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters'); return;
    }
    setSaving(true);
    try {
      await authService.changePassword(pwdForm.currentPassword, pwdForm.newPassword);
      toast.success('Password changed successfully!');
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Password change failed'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Profile Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, color: 'var(--color-primary)', flexShrink: 0 }}>
            <BsPersonCircle />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{user?.full_name}</h2>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>{user?.email}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <span className={`badge badge-${user?.role}`} style={{ textTransform: 'capitalize' }}>{user?.role}</span>
              <span className="badge badge-active">Active</span>
            </div>
          </div>
        </div>

        <div className="card-body" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
          <div className="grid grid-cols-2" style={{ gap: 16 }}>
            {[
              ['Full Name', user?.full_name],
              ['Email', user?.email],
              ['Role', user?.role],
              ['Institute', user?.institute_name],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>{value || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><BsShieldLock style={{ marginRight: 8 }} />Change Password</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Current Password <span className="required">*</span></label>
              <input type="password" className="form-control" value={pwdForm.currentPassword} onChange={e => setPwdForm(f => ({ ...f, currentPassword: e.target.value }))} required autoComplete="current-password" />
            </div>
            <div className="form-group">
              <label className="form-label">New Password <span className="required">*</span></label>
              <input type="password" className="form-control" value={pwdForm.newPassword} onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={8} autoComplete="new-password" />
              <div className="form-text">Min 8 characters, with at least one uppercase letter and one number</div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password <span className="required">*</span></label>
              <input type="password" className="form-control" value={pwdForm.confirmPassword} onChange={e => setPwdForm(f => ({ ...f, confirmPassword: e.target.value }))} required autoComplete="new-password"
                style={{ borderColor: pwdForm.confirmPassword && pwdForm.confirmPassword !== pwdForm.newPassword ? 'var(--color-danger)' : undefined }} />
              {pwdForm.confirmPassword && pwdForm.confirmPassword !== pwdForm.newPassword && <div className="invalid-feedback">Passwords do not match</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
