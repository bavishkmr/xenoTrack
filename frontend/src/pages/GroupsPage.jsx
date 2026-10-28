import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { programService, feeService } from '../services';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { BsPlus, BsEye, BsPencil } from 'react-icons/bs';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export default function GroupsPage() {
  const { isAdmin } = useAuth();
  const [groups, setGroups] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [feePlans, setFeePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProgram, setFilterProgram] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', program_id: '', scheduled_days: [], start_time: '09:00', end_time: '10:00', capacity: '', status: 'active', default_fee_plan_id: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [g, p, f] = await Promise.all([
        programService.listGroups({ program_id: filterProgram, status: filterStatus }),
        programService.listPrograms({ status: 'active' }),
        feeService.listPlans({ status: 'active' }),
      ]);
      setGroups(g.data.data); setPrograms(p.data.data); setFeePlans(f.data.data);
    } catch { toast.error('Failed to load groups'); }
    finally { setLoading(false); }
  }, [filterProgram, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const toggleDay = day => {
    setForm(f => ({ ...f, scheduled_days: f.scheduled_days.includes(day) ? f.scheduled_days.filter(d => d !== day) : [...f.scheduled_days, day] }));
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', program_id: '', scheduled_days: [], start_time: '09:00', end_time: '10:00', capacity: '', status: 'active', default_fee_plan_id: '' });
    setShowModal(true);
  };

  const openEdit = g => {
    setEditItem(g);
    setForm({
      name: g.name || '', program_id: g.program_id || '', status: g.status || 'active',
      scheduled_days: Array.isArray(g.scheduled_days) ? g.scheduled_days : JSON.parse(g.scheduled_days || '[]'),
      start_time: g.start_time || '09:00', end_time: g.end_time || '10:00',
      capacity: g.capacity || '', default_fee_plan_id: g.default_fee_plan_id || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async e => {
    e.preventDefault(); setSubmitting(true);
    try {
      const payload = { ...form, capacity: form.capacity ? Number(form.capacity) : null, scheduled_days: JSON.stringify(form.scheduled_days) };
      if (editItem) { await programService.updateGroup(editItem.id, payload); toast.success('Group updated'); }
      else { await programService.createGroup(payload); toast.success('Group created'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const parseDays = days => {
    try { return (Array.isArray(days) ? days : JSON.parse(days || '[]')).join(', ') || '—'; } catch { return '—'; }
  };

  return (
    <div>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <button className="btn btn-primary" onClick={openAdd}><BsPlus size={18} /> Add Group</button>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="filters-row">
            <select className="form-select" style={{ width: 180 }} value={filterProgram} onChange={e => setFilterProgram(e.target.value)}>
              <option value="">All Programs</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="form-select" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Groups ({groups.length})</h3></div>
        <div className="table-container">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> : !groups.length ? (
            <div className="empty-state"><div className="empty-state-icon">👥</div><div className="empty-state-title">No groups found</div></div>
          ) : (
            <table className="table">
              <thead><tr><th>Group</th><th>Program</th><th>Schedule</th><th>Members</th><th>Staff</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {groups.map(g => (
                  <tr key={g.id}>
                    <td><div style={{ fontWeight: 600 }}>{g.name}</div></td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{g.program_name}</td>
                    <td style={{ fontSize: 12 }}>
                      <div>{parseDays(g.scheduled_days)}</div>
                      <div style={{ color: 'var(--color-text-muted)' }}>{g.start_time} – {g.end_time}</div>
                    </td>
                    <td>{g.member_count ?? 0}{g.capacity ? `/${g.capacity}` : ''}</td>
                    <td style={{ fontSize: 12, maxWidth: 120 }}>{g.staff_names || '—'}</td>
                    <td><span className={`badge badge-${g.status}`} style={{ textTransform: 'capitalize' }}>{g.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link to={`/groups/${g.id}`} className="btn btn-sm btn-secondary btn-icon" title="View"><BsEye /></Link>
                        {isAdmin && <button className="btn btn-sm btn-secondary btn-icon" onClick={() => openEdit(g)} title="Edit"><BsPencil /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal show={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Group' : 'Add Group'}>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Group Name <span className="required">*</span></label>
              <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Program <span className="required">*</span></label>
              <select className="form-select" value={form.program_id} onChange={e => setForm(f => ({ ...f, program_id: e.target.value }))} required>
                <option value="">Select program</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input type="time" className="form-control" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input type="time" className="form-control" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Capacity (optional)</label>
              <input type="number" className="form-control" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} min={1} placeholder="Unlimited" />
            </div>
            <div className="form-group">
              <label className="form-label">Default Fee Plan</label>
              <select className="form-select" value={form.default_fee_plan_id} onChange={e => setForm(f => ({ ...f, default_fee_plan_id: e.target.value }))}>
                <option value="">None</option>
                {feePlans.map(fp => <option key={fp.id} value={fp.id}>{fp.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Scheduled Days</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {DAYS.map(day => (
                  <button key={day} type="button"
                    onClick={() => toggleDay(day)}
                    style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid', fontFamily: 'inherit', transition: 'all .15s', background: form.scheduled_days.includes(day) ? 'var(--color-primary)' : 'transparent', color: form.scheduled_days.includes(day) ? '#fff' : 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
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
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editItem ? 'Update' : 'Create Group'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
