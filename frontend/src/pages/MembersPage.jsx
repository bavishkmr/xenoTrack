import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { memberService, programService, feeService } from '../services';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { BsPlus, BsSearch, BsFunnel, BsPencil, BsEye, BsPersonSlash } from 'react-icons/bs';

const STATUSES = ['active','inactive','suspended','completed'];
const GENDERS  = ['male','female','other','prefer_not_to_say'];

export default function MembersPage() {
  const { isAdmin } = useAuth();
  const [members, setMembers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total:0, page:1, totalPages:1 });
  const [filters, setFilters] = useState({ search:'', status:'active', program_id:'', group_id:'' });
  const [showModal, setShowModal] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [form, setForm] = useState({ full_name:'', phone:'', email:'', dob:'', gender:'', address:'', emergency_contact:'', notes:'' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await memberService.list({ ...filters, page, limit: 20 });
      setMembers(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load members'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(1); }, [load]);
  useEffect(() => {
    Promise.all([programService.listPrograms({ status:'active' }), programService.listGroups({ status:'active' })])
      .then(([p, g]) => { setPrograms(p.data.data); setGroups(g.data.data); });
  }, []);

  const openAdd = () => {
    setEditMember(null);
    setForm({ full_name:'', phone:'', email:'', dob:'', gender:'', address:'', emergency_contact:'', notes:'' });
    setShowModal(true);
  };

  const openEdit = m => {
    setEditMember(m);
    setForm({ full_name: m.full_name||'', phone: m.phone||'', email: m.email||'', dob: m.dob?.slice(0,10)||'',
      gender: m.gender||'', address: m.address||'', emergency_contact: m.emergency_contact||'', notes: m.notes||'' });
    setShowModal(true);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editMember) {
        await memberService.update(editMember.id, form);
        toast.success('Member updated');
      } else {
        await memberService.create(form);
        toast.success('Member created');
      }
      setShowModal(false);
      load(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally { setSubmitting(false); }
  };

  const handleStatusChange = async (id, status) => {
    if (!window.confirm(`Change member status to "${status}"?`)) return;
    try {
      await memberService.updateStatus(id, status);
      toast.success('Status updated');
      load(pagination.page);
    } catch { toast.error('Failed to update status'); }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div />
        {isAdmin && <button className="btn btn-primary" onClick={openAdd}><BsPlus size={18} /> Add Member</button>}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="filters-row">
            <div className="search-box flex-1" style={{ minWidth: 220 }}>
              <BsSearch className="search-icon" />
              <input className="form-control" placeholder="Search by name, code, phone…"
                value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
            </div>
            <select className="form-select" style={{ width:140 }} value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="form-select" style={{ width:160 }} value={filters.program_id}
              onChange={e => setFilters(f => ({ ...f, program_id: e.target.value }))}>
              <option value="">All Programs</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="form-select" style={{ width:160 }} value={filters.group_id}
              onChange={e => setFilters(f => ({ ...f, group_id: e.target.value }))}>
              <option value="">All Groups</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Members ({pagination.total})</h3>
        </div>
        <div className="table-container">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : !members.length ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">No members found</div>
              <div className="empty-state-desc">Adjust filters or add a new member</div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th><th>Phone</th><th>Programs</th>
                  <th>Registration</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td>
                      <Link to={`/members/${m.id}`} className="link" style={{ fontWeight:600 }}>{m.full_name}</Link>
                      <div style={{ fontSize:11, color:'var(--color-text-muted)' }}>{m.member_code}</div>
                    </td>
                    <td>{m.phone || '—'}</td>
                    <td style={{ fontSize:12, color:'var(--color-text-secondary)', maxWidth:160 }}>{m.programs || '—'}</td>
                    <td style={{ fontSize:12 }}>{m.registration_date}</td>
                    <td><span className={`badge badge-${m.status}`} style={{ textTransform:'capitalize' }}>{m.status}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <Link to={`/members/${m.id}`} className="btn btn-sm btn-secondary btn-icon" title="View"><BsEye /></Link>
                        {isAdmin && <button className="btn btn-sm btn-secondary btn-icon" title="Edit" onClick={() => openEdit(m)}><BsPencil /></button>}
                        {isAdmin && m.status === 'active' && (
                          <button className="btn btn-sm btn-secondary btn-icon" title="Deactivate"
                            onClick={() => handleStatusChange(m.id, 'inactive')}><BsPersonSlash /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ padding:'12px 20px', borderTop:'1px solid var(--color-border)', display:'flex', justifyContent:'flex-end' }}>
            <div className="pagination">
              <button className="page-btn" disabled={pagination.page === 1} onClick={() => load(pagination.page - 1)}>‹</button>
              {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => i + 1).map(p => (
                <button key={p} className={`page-btn${p === pagination.page ? ' active' : ''}`} onClick={() => load(p)}>{p}</button>
              ))}
              <button className="page-btn" disabled={pagination.page === pagination.totalPages} onClick={() => load(pagination.page + 1)}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onClose={() => setShowModal(false)} title={editMember ? 'Edit Member' : 'Add Member'}>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2">
            <div className="form-group" style={{ gridColumn:'1/-1' }}>
              <label className="form-label">Full Name <span className="required">*</span></label>
              <input className="form-control" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input type="date" className="form-control" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-select" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">Select gender</option>
                {GENDERS.map(g => <option key={g} value={g}>{g.replace('_',' ')}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn:'1/-1' }}>
              <label className="form-label">Address</label>
              <textarea className="form-control" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} />
            </div>
            <div className="form-group">
              <label className="form-label">Emergency Contact</label>
              <input className="form-control" value={form.emergency_contact} onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-control" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="modal-footer" style={{ padding:'16px 0 0', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <><div className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> Saving…</> : editMember ? 'Update' : 'Create Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
