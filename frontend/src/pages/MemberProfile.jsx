import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { memberService, programService, feeService, settingsService } from '../services';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { BsPencil, BsPersonCircle, BsPlus } from 'react-icons/bs';

const TABS = ['Info', 'Enrollments', 'Fee Records', 'Payments'];

export default function MemberProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Info');

  // Enrollment modal
  const [showEnroll, setShowEnroll] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [feePlans, setFeePlans] = useState([]);
  const [enrollForm, setEnrollForm] = useState({ program_id: '', group_id: '', fee_plan_id: '' });
  const [enrolling, setEnrolling] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [genderOptions, setGenderOptions] = useState([]);

  const fetchGenders = useCallback(() => {
    settingsService.getGenderOptions({ status: 'active' })
      .then(r => setGenderOptions(r.data.data || []))
      .catch(console.error);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await memberService.getById(id);
      setMember(res.data.data);
    } catch { toast.error('Failed to load member'); navigate('/members'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => {
    load();
    fetchGenders();
  }, [load, fetchGenders]);

  useEffect(() => {
    if (showEnroll) {
      Promise.all([
        programService.listPrograms({ status: 'active' }),
        feeService.listPlans({ status: 'active' }),
      ]).then(([p, f]) => { setPrograms(p.data.data); setFeePlans(f.data.data); });
    }
  }, [showEnroll]);

  useEffect(() => {
    if (enrollForm.program_id) {
      programService.listGroups({ program_id: enrollForm.program_id, status: 'active' })
        .then(r => setGroups(r.data.data));
    } else { setGroups([]); }
  }, [enrollForm.program_id]);

  const openEdit = () => {
    fetchGenders();
    setEditForm({
      full_name: member.full_name || '', phone: member.phone || '',
      email: member.email || '', dob: member.dob?.slice(0, 10) || '',
      gender: member.gender || '', address: member.address || '',
      emergency_contact: member.emergency_contact || '', notes: member.notes || '',
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async e => {
    e.preventDefault(); setSaving(true);
    try { await memberService.update(id, editForm); toast.success('Member updated'); setShowEdit(false); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  const handleEnroll = async e => {
    e.preventDefault(); setEnrolling(true);
    try {
      await programService.enroll({ member_id: Number(id), ...enrollForm });
      toast.success('Member enrolled'); setShowEnroll(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Enrollment failed'); }
    finally { setEnrolling(false); }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;
  if (!member) return null;

  const { enrollments = [], feeRecords = [], payments = [] } = member;

  return (
    <div>
      {/* Profile Header */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'var(--color-primary)', flexShrink: 0 }}>
            <BsPersonCircle />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{member.full_name}</h2>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', background: 'var(--color-bg)', padding: '2px 10px', borderRadius: 99, border: '1px solid var(--color-border)' }}>{member.member_code}</span>
              <span className={`badge badge-${member.status}`} style={{ textTransform: 'capitalize' }}>{member.status}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px 24px', marginTop: 12 }}>
              {member.phone && <div><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Phone</span><div style={{ fontSize: 13, fontWeight: 500 }}>{member.phone}</div></div>}
              {member.email && <div><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Email</span><div style={{ fontSize: 13, fontWeight: 500 }}>{member.email}</div></div>}
              {member.dob && <div><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Date of Birth</span><div style={{ fontSize: 13, fontWeight: 500 }}>{member.dob?.slice(0, 10)}</div></div>}
              {member.gender && <div><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Gender</span><div style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>{member.gender?.replace('_', ' ')}</div></div>}
              <div><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Registered</span><div style={{ fontSize: 13, fontWeight: 500 }}>{member.registration_date}</div></div>
            </div>
          </div>
          {isAdmin && <button className="btn btn-secondary" onClick={openEdit}><BsPencil size={14} /> Edit</button>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--color-border)', marginBottom: 20, gap: 4 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: tab === t ? 'var(--color-primary)' : 'var(--color-text-secondary)', borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent', marginBottom: -2, fontFamily: 'inherit', transition: 'color .15s' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {tab === 'Info' && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Member Details</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2" style={{ gap: 16 }}>
              {[
                ['Full Name', member.full_name], ['Member Code', member.member_code],
                ['Phone', member.phone], ['Email', member.email],
                ['Date of Birth', member.dob?.slice(0, 10)], ['Gender', member.gender?.replace('_', ' ')],
                ['Address', member.address], ['Emergency Contact', member.emergency_contact],
                ['Registration Date', member.registration_date], ['Status', member.status],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, textTransform: label === 'Status' || label === 'Gender' ? 'capitalize' : 'none' }}>{value || '—'}</div>
                </div>
              ))}
              {member.notes && (
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>Notes</div>
                  <div style={{ fontSize: 14 }}>{member.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enrollments Tab */}
      {tab === 'Enrollments' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Enrollments ({enrollments.length})</h3>
            {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => setShowEnroll(true)}><BsPlus /> Enroll</button>}
          </div>
          <div className="table-container">
            {!enrollments.length ? (
              <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">No enrollments yet</div></div>
            ) : (
              <table className="table">
                <thead><tr><th>Program</th><th>Group</th><th>Fee Plan</th><th>Enrollment Date</th><th>Status</th></tr></thead>
                <tbody>
                  {enrollments.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.program_name}</td>
                      <td>{e.group_name || '—'}</td>
                      <td>{e.fee_plan_name || '—'}</td>
                      <td style={{ fontSize: 12 }}>{e.enrollment_date?.slice(0, 10)}</td>
                      <td><span className={`badge badge-${e.status}`} style={{ textTransform: 'capitalize' }}>{e.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Fee Records Tab */}
      {tab === 'Fee Records' && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Fee Records ({feeRecords.length})</h3></div>
          <div className="table-container">
            {!feeRecords.length ? (
              <div className="empty-state"><div className="empty-state-icon">🧾</div><div className="empty-state-title">No fee records</div></div>
            ) : (
              <table className="table">
                <thead><tr><th>Period</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th></tr></thead>
                <tbody>
                  {feeRecords.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.billing_period_label}</td>
                      <td>₹{parseFloat(r.final_amount || 0).toLocaleString()}</td>
                      <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>₹{parseFloat(r.amount_paid || 0).toLocaleString()}</td>
                      <td style={{ color: parseFloat(r.outstanding_balance) > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600 }}>₹{parseFloat(r.outstanding_balance || 0).toLocaleString()}</td>
                      <td style={{ fontSize: 12 }}>{r.due_date}</td>
                      <td><span className={`badge badge-${r.status}`} style={{ textTransform: 'capitalize' }}>{r.status?.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {tab === 'Payments' && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Payment History ({payments.length})</h3></div>
          <div className="table-container">
            {!payments.length ? (
              <div className="empty-state"><div className="empty-state-icon">💳</div><div className="empty-state-title">No payments recorded</div></div>
            ) : (
              <table className="table">
                <thead><tr><th>Receipt #</th><th>Amount</th><th>Method</th><th>Date</th><th>Collected By</th><th></th></tr></thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.receipt_number}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>₹{parseFloat(p.amount).toLocaleString()}</td>
                      <td><span className="badge badge-active" style={{ textTransform: 'capitalize' }}>{p.payment_method?.replace('_', ' ')}</span></td>
                      <td style={{ fontSize: 12 }}>{p.payment_date}</td>
                      <td style={{ fontSize: 12 }}>{p.collected_by_name || '—'}</td>
                      <td><Link to={`/payments/${p.id}/receipt`} className="btn btn-sm btn-outline-primary">Receipt</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal show={showEdit} onClose={() => setShowEdit(false)} title="Edit Member">
        <form onSubmit={handleSaveEdit}>
          <div className="grid grid-cols-2">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Full Name <span className="required">*</span></label>
              <input className="form-control" value={editForm.full_name || ''} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} required />
            </div>
            <div className="form-group"><label className="form-label">Phone</label><input className="form-control" value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-control" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Date of Birth</label><input type="date" className="form-control" value={editForm.dob || ''} onChange={e => setEditForm(f => ({ ...f, dob: e.target.value }))} /></div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-select" value={editForm.gender || ''} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}>
                {genderOptions.length === 0 && !editForm.gender ? (
                  <option value="" disabled>No active gender options configured</option>
                ) : (
                  <option value="">Select</option>
                )}
                {genderOptions.map(opt => (
                  <option key={opt.id} value={opt.name}>{opt.name}</option>
                ))}
                {editForm.gender && !genderOptions.some(opt => opt.name.toLowerCase() === editForm.gender.toLowerCase()) && (
                  <option value={editForm.gender}>{editForm.gender} (Saved)</option>
                )}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Address</label><textarea className="form-control" value={editForm.address || ''} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} rows={2} /></div>
            <div className="form-group"><label className="form-label">Emergency Contact</label><input className="form-control" value={editForm.emergency_contact || ''} onChange={e => setEditForm(f => ({ ...f, emergency_contact: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Notes</label><input className="form-control" value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>

      {/* Enroll Modal */}
      <Modal show={showEnroll} onClose={() => setShowEnroll(false)} title="Enroll Member">
        <form onSubmit={handleEnroll}>
          <div className="form-group">
            <label className="form-label">Program <span className="required">*</span></label>
            <select className="form-select" value={enrollForm.program_id} onChange={e => setEnrollForm(f => ({ ...f, program_id: e.target.value, group_id: '' }))} required>
              <option value="">Select program</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Group (optional)</label>
            <select className="form-select" value={enrollForm.group_id} onChange={e => setEnrollForm(f => ({ ...f, group_id: e.target.value }))}>
              <option value="">No group</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Fee Plan (optional)</label>
            <select className="form-select" value={enrollForm.fee_plan_id} onChange={e => setEnrollForm(f => ({ ...f, fee_plan_id: e.target.value }))}>
              <option value="">Select fee plan</option>
              {feePlans.map(fp => <option key={fp.id} value={fp.id}>{fp.name} — ₹{parseFloat(fp.amount).toLocaleString()}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowEnroll(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={enrolling}>{enrolling ? 'Enrolling…' : 'Enroll'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
