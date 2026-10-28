import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { feeService } from '../services';
import Modal from '../components/Modal';
import { BsPlus, BsPencil, BsToggleOn, BsToggleOff } from 'react-icons/bs';

const FREQUENCIES = ['one_time','weekly','monthly','quarterly','half_yearly','yearly','custom'];

export default function FeePlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', amount: '', frequency: 'monthly', due_day: '', late_fee_amount: '', late_fee_after_days: '', discount_amount: '', discount_type: 'flat', status: 'active' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await feeService.listPlans({}); setPlans(r.data.data); }
    catch { toast.error('Failed to load fee plans'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', description: '', amount: '', frequency: 'monthly', due_day: '', late_fee_amount: '', late_fee_after_days: '', discount_amount: '', discount_type: 'flat', status: 'active' });
    setShowModal(true);
  };

  const openEdit = p => {
    setEditItem(p);
    setForm({ name: p.name || '', description: p.description || '', amount: p.amount || '', frequency: p.frequency || 'monthly', due_day: p.due_day || '', late_fee_amount: p.late_fee_amount || '', late_fee_after_days: p.late_fee_after_days || '', discount_amount: p.discount_amount || '', discount_type: p.discount_type || 'flat', status: p.status || 'active' });
    setShowModal(true);
  };

  const handleSubmit = async e => {
    e.preventDefault(); setSubmitting(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) || 0, due_day: form.due_day ? Number(form.due_day) : null, late_fee_amount: form.late_fee_amount ? parseFloat(form.late_fee_amount) : null, late_fee_after_days: form.late_fee_after_days ? Number(form.late_fee_after_days) : null, discount_amount: form.discount_amount ? parseFloat(form.discount_amount) : null };
      if (editItem) { await feeService.updatePlan(editItem.id, payload); toast.success('Fee plan updated'); }
      else { await feeService.createPlan(payload); toast.success('Fee plan created'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const toggle = async p => {
    try { await feeService.updatePlan(p.id, { ...p, status: p.status === 'active' ? 'inactive' : 'active' }); toast.success('Status updated'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={openAdd}><BsPlus size={18} /> Add Fee Plan</button>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Fee Plans ({plans.length})</h3></div>
        <div className="table-container">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> : !plans.length ? (
            <div className="empty-state"><div className="empty-state-icon">💰</div><div className="empty-state-title">No fee plans yet</div></div>
          ) : (
            <table className="table">
              <thead><tr><th>Plan Name</th><th>Amount</th><th>Frequency</th><th>Due Day</th><th>Late Fee</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {plans.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.description && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{p.description}</div>}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>₹{parseFloat(p.amount).toLocaleString()}</td>
                    <td style={{ textTransform: 'capitalize', fontSize: 13 }}>{p.frequency?.replace('_', ' ')}</td>
                    <td>{p.due_day ? `Day ${p.due_day}` : '—'}</td>
                    <td>{p.late_fee_amount ? `₹${parseFloat(p.late_fee_amount).toLocaleString()} after ${p.late_fee_after_days || 0}d` : '—'}</td>
                    <td><span className={`badge badge-${p.status}`} style={{ textTransform: 'capitalize' }}>{p.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-secondary btn-icon" onClick={() => openEdit(p)}><BsPencil /></button>
                        <button className="btn btn-sm btn-secondary btn-icon" onClick={() => toggle(p)}>
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

      <Modal show={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Fee Plan' : 'Add Fee Plan'}>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Plan Name <span className="required">*</span></label>
              <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Monthly Standard" />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹) <span className="required">*</span></label>
              <input type="number" className="form-control" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required min={0} step={0.01} />
            </div>
            <div className="form-group">
              <label className="form-label">Billing Frequency</label>
              <select className="form-select" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                {FREQUENCIES.map(fr => <option key={fr} value={fr}>{fr.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Day</label>
              <input type="number" className="form-control" value={form.due_day} onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))} min={1} max={31} placeholder="e.g. 5 (5th of month)" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-control" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div style={{ gridColumn: '1/-1' }}><hr className="divider" /><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>Late Fee (Optional)</div></div>
            <div className="form-group">
              <label className="form-label">Late Fee Amount (₹)</label>
              <input type="number" className="form-control" value={form.late_fee_amount} onChange={e => setForm(f => ({ ...f, late_fee_amount: e.target.value }))} min={0} step={0.01} />
            </div>
            <div className="form-group">
              <label className="form-label">Apply After (days)</label>
              <input type="number" className="form-control" value={form.late_fee_after_days} onChange={e => setForm(f => ({ ...f, late_fee_after_days: e.target.value }))} min={0} placeholder="e.g. 7" />
            </div>

            <div style={{ gridColumn: '1/-1' }}><hr className="divider" /><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>Discount (Optional)</div></div>
            <div className="form-group">
              <label className="form-label">Discount Amount</label>
              <input type="number" className="form-control" value={form.discount_amount} onChange={e => setForm(f => ({ ...f, discount_amount: e.target.value }))} min={0} step={0.01} />
            </div>
            <div className="form-group">
              <label className="form-label">Discount Type</label>
              <select className="form-select" value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}>
                <option value="flat">Flat (₹)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editItem ? 'Update Plan' : 'Create Plan'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
