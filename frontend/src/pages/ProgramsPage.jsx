import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { programService, feeService } from '../services';
import Modal from '../components/Modal';
import { BsPlus, BsPencil, BsToggleOn, BsToggleOff } from 'react-icons/bs';

const TYPES = ['tuition','fitness','sports','arts','music','language','skill','other'];

export default function ProgramsPage() {
  const [programs, setPrograms] = useState([]);
  const [feePlans, setFeePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', program_type: '', default_fee_plan_id: '', status: 'active' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, f] = await Promise.all([programService.listPrograms({}), feeService.listPlans({ status: 'active' })]);
      setPrograms(p.data.data);
      setFeePlans(f.data.data);
    } catch { toast.error('Failed to load programs'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', description: '', program_type: '', default_fee_plan_id: '', status: 'active' });
    setShowModal(true);
  };

  const openEdit = p => {
    setEditItem(p);
    setForm({ name: p.name || '', description: p.description || '', program_type: p.program_type || '', default_fee_plan_id: p.default_fee_plan_id || '', status: p.status || 'active' });
    setShowModal(true);
  };

  const handleSubmit = async e => {
    e.preventDefault(); setSubmitting(true);
    try {
      if (editItem) { await programService.updateProgram(editItem.id, form); toast.success('Program updated'); }
      else { await programService.createProgram(form); toast.success('Program created'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const toggleStatus = async p => {
    try {
      await programService.updateProgram(p.id, { ...p, status: p.status === 'active' ? 'inactive' : 'active' });
      toast.success('Status updated'); load();
    } catch { toast.error('Failed to update status'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={openAdd}><BsPlus size={18} /> Add Program</button>
      </div>
      <div className="card">
        <div className="card-header"><h3 className="card-title">Programs ({programs.length})</h3></div>
        <div className="table-container">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> : !programs.length ? (
            <div className="empty-state"><div className="empty-state-icon">📚</div><div className="empty-state-title">No programs yet</div><div className="empty-state-desc">Add your first program to get started</div></div>
          ) : (
            <table className="table">
              <thead><tr><th>Program</th><th>Type</th><th>Default Fee Plan</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {programs.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.description && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{p.description}</div>}
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{p.program_type || '—'}</td>
                    <td style={{ fontSize: 12 }}>{p.default_fee_plan_name || '—'}</td>
                    <td><span className={`badge badge-${p.status}`} style={{ textTransform: 'capitalize' }}>{p.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-secondary btn-icon" onClick={() => openEdit(p)} title="Edit"><BsPencil /></button>
                        <button className="btn btn-sm btn-secondary btn-icon" onClick={() => toggleStatus(p)} title="Toggle Status">
                          {p.status === 'active' ? <BsToggleOn style={{ color: 'var(--color-success)' }} /> : <BsToggleOff />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal show={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Program' : 'Add Program'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Program Name <span className="required">*</span></label>
            <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Mathematics Tuition, Yoga, Football" />
          </div>
          <div className="form-group">
            <label className="form-label">Program Type</label>
            <select className="form-select" value={form.program_type} onChange={e => setForm(f => ({ ...f, program_type: e.target.value }))}>
              <option value="">Select type</option>
              {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          </div>
          <div className="form-group">
            <label className="form-label">Default Fee Plan</label>
            <select className="form-select" value={form.default_fee_plan_id} onChange={e => setForm(f => ({ ...f, default_fee_plan_id: e.target.value }))}>
              <option value="">None</option>
              {feePlans.map(fp => <option key={fp.id} value={fp.id}>{fp.name} — ₹{parseFloat(fp.amount).toLocaleString()}</option>)}
            </select>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editItem ? 'Update' : 'Create Program'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
