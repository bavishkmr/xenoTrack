import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { programService, staffService, memberService, feeService } from '../services';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { BsPlus, BsTrash, BsPeopleFill, BsPersonBadgeFill } from 'react-icons/bs';

const TABS = ['Members', 'Staff'];

export default function GroupDetail() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Members');

  // Member enroll modal
  const [showEnroll, setShowEnroll] = useState(false);
  const [members, setMembers] = useState([]);
  const [feePlans, setFeePlans] = useState([]);
  const [enrollForm, setEnrollForm] = useState({ member_id: '', fee_plan_id: '' });
  const [enrolling, setEnrolling] = useState(false);

  // Staff assign modal
  const [showStaff, setShowStaff] = useState(false);
  const [allStaff, setAllStaff] = useState([]);
  const [staffForm, setStaffForm] = useState({ staff_profile_id: '', is_primary: false });
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    try { const r = await programService.getGroup(id); setGroup(r.data.data); }
    catch { toast.error('Failed to load group'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (showEnroll) {
      Promise.all([
        memberService.list({ status: 'active', limit: 200 }),
        feeService.listPlans({ status: 'active' }),
      ]).then(([m, f]) => { setMembers(m.data.data); setFeePlans(f.data.data); });
    }
  }, [showEnroll]);

  useEffect(() => {
    if (showStaff) {
      staffService.list({ status: 'active' }).then(r => setAllStaff(r.data.data));
    }
  }, [showStaff]);

  const handleEnroll = async e => {
    e.preventDefault(); setEnrolling(true);
    try {
      await programService.enroll({ member_id: Number(enrollForm.member_id), program_id: group.program_id, group_id: Number(id), fee_plan_id: enrollForm.fee_plan_id || undefined });
      toast.success('Member enrolled'); setShowEnroll(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Enrollment failed'); }
    finally { setEnrolling(false); }
  };

  const handleAssignStaff = async e => {
    e.preventDefault(); setAssigning(true);
    try {
      await programService.assignStaff(id, { staff_profile_id: Number(staffForm.staff_profile_id), is_primary: staffForm.is_primary });
      toast.success('Staff assigned'); setShowStaff(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setAssigning(false); }
  };

  const handleRemoveStaff = async staffProfileId => {
    if (!window.confirm('Remove this staff from the group?')) return;
    try { await programService.removeStaff(id, staffProfileId); toast.success('Staff removed'); load(); }
    catch { toast.error('Failed to remove staff'); }
  };

  const parseDays = days => {
    try { return (Array.isArray(days) ? days : JSON.parse(days || '[]')).join(', ') || '—'; } catch { return '—'; }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;
  if (!group) return <div className="alert alert-danger">Group not found</div>;

  const { enrollments = [], staffAssignments = [] } = group;

  return (
    <div>
      {/* Group header card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{group.name}</h2>
                <span className={`badge badge-${group.status}`} style={{ textTransform: 'capitalize' }}>{group.status}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Program: <strong>{group.program_name}</strong>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '6px 24px', textAlign: 'center' }}>
              <div><div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)' }}>{enrollments.length}</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Members</div></div>
              <div><div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)' }}>{staffAssignments.length}</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Staff</div></div>
              <div><div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)' }}>{group.capacity || '∞'}</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Capacity</div></div>
            </div>
          </div>
          <hr className="divider" />
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', fontSize: 13 }}>
            <div><span style={{ color: 'var(--color-text-muted)' }}>Schedule: </span><strong>{parseDays(group.scheduled_days)}</strong></div>
            <div><span style={{ color: 'var(--color-text-muted)' }}>Time: </span><strong>{group.start_time} – {group.end_time}</strong></div>
            {group.start_date && <div><span style={{ color: 'var(--color-text-muted)' }}>Start Date: </span><strong>{group.start_date}</strong></div>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--color-border)', marginBottom: 20, gap: 4 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: tab === t ? 'var(--color-primary)' : 'var(--color-text-secondary)', borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent', marginBottom: -2, fontFamily: 'inherit' }}>
            {t === 'Members' ? <><BsPeopleFill style={{ marginRight: 6 }} />{t} ({enrollments.length})</> : <><BsPersonBadgeFill style={{ marginRight: 6 }} />{t} ({staffAssignments.length})</>}
          </button>
        ))}
      </div>

      {/* Members Tab */}
      {tab === 'Members' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Enrolled Members</h3>
            {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => setShowEnroll(true)}><BsPlus /> Enroll Member</button>}
          </div>
          <div className="table-container">
            {!enrollments.length ? (
              <div className="empty-state"><div className="empty-state-icon">👥</div><div className="empty-state-title">No members enrolled</div></div>
            ) : (
              <table className="table">
                <thead><tr><th>Member</th><th>Phone</th><th>Fee Plan</th><th>Enrolled</th><th>Status</th></tr></thead>
                <tbody>
                  {enrollments.map(e => (
                    <tr key={e.id}>
                      <td>
                        <Link to={`/members/${e.member_id}`} className="link" style={{ fontWeight: 600 }}>{e.member_name}</Link>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{e.member_code}</div>
                      </td>
                      <td>{e.member_phone || '—'}</td>
                      <td style={{ fontSize: 12 }}>{e.fee_plan_name || '—'}</td>
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

      {/* Staff Tab */}
      {tab === 'Staff' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Assigned Staff</h3>
            {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => { setStaffForm({ staff_profile_id: '', is_primary: false }); setShowStaff(true); }}><BsPlus /> Assign Staff</button>}
          </div>
          <div className="table-container">
            {!staffAssignments.length ? (
              <div className="empty-state"><div className="empty-state-icon">👤</div><div className="empty-state-title">No staff assigned</div></div>
            ) : (
              <table className="table">
                <thead><tr><th>Staff Member</th><th>Email</th><th>Role</th><th>Primary</th>{isAdmin && <th>Actions</th>}</tr></thead>
                <tbody>
                  {staffAssignments.map(s => (
                    <tr key={s.staff_profile_id}>
                      <td style={{ fontWeight: 600 }}>{s.full_name}</td>
                      <td style={{ fontSize: 12 }}>{s.email}</td>
                      <td style={{ fontSize: 12 }}>{s.designation || '—'}</td>
                      <td>{s.is_primary ? <span className="badge badge-active">Primary</span> : <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>No</span>}</td>
                      {isAdmin && <td><button className="btn btn-sm btn-secondary btn-icon" onClick={() => handleRemoveStaff(s.staff_profile_id)} title="Remove"><BsTrash style={{ color: 'var(--color-danger)' }} /></button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Enroll Modal */}
      <Modal show={showEnroll} onClose={() => setShowEnroll(false)} title="Enroll Member">
        <form onSubmit={handleEnroll}>
          <div className="form-group">
            <label className="form-label">Select Member <span className="required">*</span></label>
            <select className="form-select" value={enrollForm.member_id} onChange={e => setEnrollForm(f => ({ ...f, member_id: e.target.value }))} required>
              <option value="">Choose member…</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.member_code})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Fee Plan</label>
            <select className="form-select" value={enrollForm.fee_plan_id} onChange={e => setEnrollForm(f => ({ ...f, fee_plan_id: e.target.value }))}>
              <option value="">Default / None</option>
              {feePlans.map(fp => <option key={fp.id} value={fp.id}>{fp.name} — ₹{parseFloat(fp.amount).toLocaleString()}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowEnroll(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={enrolling}>{enrolling ? 'Enrolling…' : 'Enroll'}</button>
          </div>
        </form>
      </Modal>

      {/* Assign Staff Modal */}
      <Modal show={showStaff} onClose={() => setShowStaff(false)} title="Assign Staff">
        <form onSubmit={handleAssignStaff}>
          <div className="form-group">
            <label className="form-label">Select Staff <span className="required">*</span></label>
            <select className="form-select" value={staffForm.staff_profile_id} onChange={e => setStaffForm(f => ({ ...f, staff_profile_id: e.target.value }))} required>
              <option value="">Choose staff…</option>
              {allStaff.map(s => <option key={s.staff_profile_id} value={s.staff_profile_id}>{s.full_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={staffForm.is_primary} onChange={e => setStaffForm(f => ({ ...f, is_primary: e.target.checked }))} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>Set as primary instructor</span>
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowStaff(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={assigning}>{assigning ? 'Assigning…' : 'Assign'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
