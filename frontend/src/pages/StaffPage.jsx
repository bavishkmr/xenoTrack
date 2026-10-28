import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { staffService } from '../services';
import Modal from '../components/Modal';
import { BsPlus, BsPencil, BsKeyFill, BsPersonCircle } from 'react-icons/bs';

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', designation: '', joining_date: '', can_collect_fees: false, can_edit_attendance: true, status: 'active' });
  const [resetPwd, setResetPwd] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await staffService.list({}); setStaff(r.data.data); }
    catch { toast.error('Failed to load staff'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ full_name: '', email: '', phone: '', password: '', designation: '', joining_date: '', can_collect_fees: false, can_edit_attendance: true, status: 'active' });
    setShowModal(true);
  };

  const openEdit = s => {
    setEditItem(s);
    setForm({ full_name: s.full_name || '', email: s.email || '', phone: s.phone || '', password: '', designation: s.designation || '', joining_date: s.joining_date?.slice(0, 10) || '', can_collect_fees: !!s.can_collect_fees, can_edit_attendance: !!s.can_edit_attendance, status: s.status || 'active' });
    setShowModal(true);
  };

  const handleSubmit = async e => {
    e.preventDefault(); setSubmitting(true);
    try {
      const payload = { ...form };
      if (editItem) { delete payload.password; await staffService.update(editItem.staff_profile_id, payload); toast.success('Staff updated'); }
      else { await staffService.create(payload); toast.success('Staff account created'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleResetPassword = async e => {
    e.preventDefault(); setSubmitting(true);
    try {
      await staffService.resetPassword(resetTarget.staff_profile_id, resetPwd);
      toast.success('Password reset successfully'); setShowReset(false); setResetPwd('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const Chk = ({ label, checked, onChange }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={openAdd}><BsPlus size={18} /> Add Staff</button>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Staff ({staff.length})</h3></div>
        <div className="table-container">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> : !staff.length ? (
            <div className="empty-state"><div className="empty-state-icon">👤</div><div className="empty-state-title">No staff accounts yet</div></div>
          ) : (
            <table className="table">
              <thead><tr><th>Staff</th><th>Email</th><th>Designation</th><th>Can Collect</th><th>Can Edit Att.</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.staff_profile_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontSize: 16 }}><BsPersonCircle /></div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.full_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{s.staff_code}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{s.email}</td>
                    <td style={{ fontSize: 13 }}>{s.designation || '—'}</td>
                    <td><span className={`badge badge-${s.can_collect_fees ? 'active' : 'inactive'}`}>{s.can_collect_fees ? 'Yes' : 'No'}</span></td>
                    <td><span className={`badge badge-${s.can_edit_attendance ? 'active' : 'inactive'}`}>{s.can_edit_attendance ? 'Yes' : 'No'}</span></td>
                    <td><span className={`badge badge-${s.status}`} style={{ textTransform: 'capitalize' }}>{s.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-secondary btn-icon" onClick={() => openEdit(s)} title="Edit"><BsPencil /></button>
                        <button className="btn btn-sm btn-secondary btn-icon" onClick={() => { setResetTarget(s); setResetPwd(''); setShowReset(true); }} title="Reset Password"><BsKeyFill /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Staff' : 'Add Staff'}>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Full Name <span className="required">*</span></label>
              <input className="form-control" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email <span className="required">*</span></label>
              <input type="email" className="form-control" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            {!editItem && (
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Password <span className="required">*</span></label>
                <input type="password" className="form-control" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!editItem} minLength={8} />
                <div className="form-text">Min 8 characters</div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Designation</label>
              <input className="form-control" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="e.g. Coach, Trainer, Instructor" />
            </div>
            <div className="form-group">
              <label className="form-label">Joining Date</label>
              <input type="date" className="form-control" value={form.joining_date} onChange={e => setForm(f => ({ ...f, joining_date: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <Chk label="Can collect fees" checked={form.can_collect_fees} onChange={v => setForm(f => ({ ...f, can_collect_fees: v }))} />
              <Chk label="Can edit attendance" checked={form.can_edit_attendance} onChange={v => setForm(f => ({ ...f, can_edit_attendance: v }))} />
            </div>
            {editItem && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editItem ? 'Update Staff' : 'Create Account'}</button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal show={showReset} onClose={() => setShowReset(false)} title={`Reset Password — ${resetTarget?.full_name}`} size="sm">
        <form onSubmit={handleResetPassword}>
          <div className="form-group">
            <label className="form-label">New Password <span className="required">*</span></label>
            <input type="password" className="form-control" value={resetPwd} onChange={e => setResetPwd(e.target.value)} required minLength={8} autoFocus />
            <div className="form-text">Min 8 characters</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowReset(false)}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={submitting}>{submitting ? 'Resetting…' : 'Reset Password'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
