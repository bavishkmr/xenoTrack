import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { attendanceService, programService } from '../services';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { BsPlus, BsSearch, BsCalendarCheck } from 'react-icons/bs';

export default function AttendancePage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ group_id: '', from_date: '', to_date: '' });
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ group_id: '', session_date: new Date().toISOString().slice(0, 10) });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const r = await attendanceService.listSessions({ ...filters, page, limit: 25 });
      setSessions(r.data.data);
      setPagination(r.data.pagination || { total: r.data.data.length, page: 1, totalPages: 1 });
    } catch { toast.error('Failed to load sessions'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(1); }, [load]);

  useEffect(() => {
    programService.listGroups({ status: 'active' }).then(r => setGroups(r.data.data));
  }, []);

  const handleCreate = async e => {
    e.preventDefault(); setCreating(true);
    try {
      const r = await attendanceService.createSession({ group_id: Number(createForm.group_id), session_date: createForm.session_date });
      toast.success('Session created');
      setShowCreate(false);
      navigate(`/attendance/mark/${r.data.data.id}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setCreating(false); }
  };

  const statusColor = s => ({ completed: 'badge-active', draft: 'badge-pending', cancelled: 'badge-inactive' }[s] || 'badge-pending');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><BsPlus size={18} /> New Session</button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="filters-row">
            <select className="form-select" style={{ width: 200 }} value={filters.group_id} onChange={e => setFilters(f => ({ ...f, group_id: e.target.value }))}>
              <option value="">All Groups</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>From</label>
              <input type="date" className="form-control" style={{ width: 150 }} value={filters.from_date} onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>To</label>
              <input type="date" className="form-control" style={{ width: 150 }} value={filters.to_date} onChange={e => setFilters(f => ({ ...f, to_date: e.target.value }))} />
            </div>
            <button className="btn btn-secondary" onClick={() => setFilters({ group_id: '', from_date: '', to_date: '' })}>Clear</button>
          </div>
        </div>
      </div>

      {/* Sessions table */}
      <div className="card">
        <div className="card-header"><h3 className="card-title">Attendance Sessions ({pagination.total})</h3></div>
        <div className="table-container">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> : !sessions.length ? (
            <div className="empty-state">
              <div className="empty-state-icon"><BsCalendarCheck size={48} style={{ opacity: .3 }} /></div>
              <div className="empty-state-title">No sessions found</div>
              <div className="empty-state-desc">Create a session to start marking attendance</div>
            </div>
          ) : (
            <table className="table">
              <thead><tr><th>Date</th><th>Group</th><th>Program</th><th>Marked By</th><th>Attendance</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.session_date}</td>
                    <td>{s.group_name}</td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{s.program_name}</td>
                    <td style={{ fontSize: 12 }}>{s.created_by_name || '—'}</td>
                    <td>
                      {s.present_count != null ? (
                        <span>
                          <strong style={{ color: 'var(--color-success)' }}>{s.present_count}</strong>
                          <span style={{ color: 'var(--color-text-muted)' }}>/{s.total_count}</span>
                        </span>
                      ) : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Pending</span>}
                    </td>
                    <td><span className={`badge ${statusColor(s.status)}`} style={{ textTransform: 'capitalize' }}>{s.status || 'draft'}</span></td>
                    <td>
                      <Link to={`/attendance/mark/${s.id}`} className={`btn btn-sm ${s.status === 'completed' ? 'btn-secondary' : 'btn-primary'}`}>
                        {s.status === 'completed' ? 'View' : 'Mark'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Session Modal */}
      <Modal show={showCreate} onClose={() => setShowCreate(false)} title="Create Attendance Session" size="sm">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Group <span className="required">*</span></label>
            <select className="form-select" value={createForm.group_id} onChange={e => setCreateForm(f => ({ ...f, group_id: e.target.value }))} required>
              <option value="">Select group</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name} — {g.program_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Session Date <span className="required">*</span></label>
            <input type="date" className="form-control" value={createForm.session_date} onChange={e => setCreateForm(f => ({ ...f, session_date: e.target.value }))} required />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Create & Mark'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
