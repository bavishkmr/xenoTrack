import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { feeService, memberService, programService } from '../services';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { BsPlus, BsSearch, BsCreditCard } from 'react-icons/bs';

const STATUSES = ['unpaid','partially_paid','paid','overdue','waived'];
const PAY_METHODS = ['cash','upi','bank_transfer','card','cheque','other'];

export default function FeeRecordsPage() {
  const { isAdmin } = useAuth();
  const [records, setRecords] = useState([]);
  const [members, setMembers] = useState([]);
  const [feePlans, setFeePlans] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ search: '', status: '', from_date: '', to_date: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [createForm, setCreateForm] = useState({ member_id: '', enrollment_id: '', fee_plan_id: '', billing_period_label: '', original_amount: '', discount_amount: '0', late_fee_amount: '0', due_date: '' });
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'cash', payment_date: new Date().toISOString().slice(0, 10), transaction_ref: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const r = await feeService.listRecords({ ...filters, page, limit: 25 });
      setRecords(r.data.data);
      setPagination(r.data.pagination || { total: r.data.data.length, page: 1, totalPages: 1 });
    } catch { toast.error('Failed to load fee records'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(1); }, [load]);

  useEffect(() => {
    Promise.all([memberService.list({ status: 'active', limit: 500 }), feeService.listPlans({ status: 'active' })]).then(([m, f]) => { setMembers(m.data.data); setFeePlans(f.data.data); });
  }, []);

  const loadEnrollments = async (memberId) => {
    if (!memberId) { setEnrollments([]); return; }
    try { const r = await memberService.getById(memberId); setEnrollments(r.data.data.enrollments || []); } catch {}
  };

  const handleCreate = async e => {
    e.preventDefault(); setSubmitting(true);
    try {
      await feeService.createRecord({ ...createForm, member_id: Number(createForm.member_id), original_amount: parseFloat(createForm.original_amount), discount_amount: parseFloat(createForm.discount_amount) || 0, late_fee_amount: parseFloat(createForm.late_fee_amount) || 0, enrollment_id: createForm.enrollment_id || undefined, fee_plan_id: createForm.fee_plan_id || undefined });
      toast.success('Fee record created'); setShowCreate(false); load(1);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handlePayment = async e => {
    e.preventDefault(); setSubmitting(true);
    try {
      const r = await feeService.createPayment({ fee_record_id: selectedRecord.id, amount: parseFloat(payForm.amount), payment_method: payForm.payment_method, payment_date: payForm.payment_date, transaction_ref: payForm.transaction_ref, notes: payForm.notes });
      toast.success('Payment recorded!'); setShowPayment(false); load(pagination.page);
    } catch (err) { toast.error(err.response?.data?.message || 'Payment failed'); }
    finally { setSubmitting(false); }
  };

  const openPayment = record => {
    setSelectedRecord(record);
    setPayForm({ amount: parseFloat(record.outstanding_balance || 0).toFixed(2), payment_method: 'cash', payment_date: new Date().toISOString().slice(0, 10), transaction_ref: '', notes: '' });
    setShowPayment(true);
  };

  return (
    <div>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <button className="btn btn-primary" onClick={() => { setCreateForm({ member_id: '', enrollment_id: '', fee_plan_id: '', billing_period_label: '', original_amount: '', discount_amount: '0', late_fee_amount: '0', due_date: '' }); setShowCreate(true); }}><BsPlus size={18} /> Create Fee Record</button>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="filters-row">
            <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
              <BsSearch className="search-icon" />
              <input className="form-control" placeholder="Search member name or code…" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
            </div>
            <select className="form-select" style={{ width: 160 }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <input type="date" className="form-control" style={{ width: 150 }} value={filters.from_date} onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))} />
            <input type="date" className="form-control" style={{ width: 150 }} value={filters.to_date} onChange={e => setFilters(f => ({ ...f, to_date: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Fee Records ({pagination.total})</h3></div>
        <div className="table-container">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> : !records.length ? (
            <div className="empty-state"><div className="empty-state-icon">🧾</div><div className="empty-state-title">No fee records found</div></div>
          ) : (
            <table className="table">
              <thead><tr><th>Member</th><th>Period</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td>
                      <Link to={`/members/${r.member_id}`} className="link" style={{ fontWeight: 600 }}>{r.member_name}</Link>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.member_code}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{r.billing_period_label}</td>
                    <td>₹{parseFloat(r.final_amount || 0).toLocaleString()}</td>
                    <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>₹{parseFloat(r.amount_paid || 0).toLocaleString()}</td>
                    <td style={{ color: parseFloat(r.outstanding_balance) > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: 600 }}>₹{parseFloat(r.outstanding_balance || 0).toLocaleString()}</td>
                    <td style={{ fontSize: 12 }}>{r.due_date}</td>
                    <td><span className={`badge badge-${r.status}`} style={{ textTransform: 'capitalize' }}>{r.status?.replace('_', ' ')}</span></td>
                    <td>
                      {['unpaid','partially_paid','overdue'].includes(r.status) && (
                        <button className="btn btn-sm btn-primary" onClick={() => openPayment(r)}><BsCreditCard size={12} /> Collect</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {pagination.totalPages > 1 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end' }}>
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

      {/* Create Fee Record Modal */}
      <Modal show={showCreate} onClose={() => setShowCreate(false)} title="Create Fee Record">
        <form onSubmit={handleCreate}>
          <div className="grid grid-cols-2">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Member <span className="required">*</span></label>
              <select className="form-select" value={createForm.member_id} onChange={e => { setCreateForm(f => ({ ...f, member_id: e.target.value, enrollment_id: '' })); loadEnrollments(e.target.value); }} required>
                <option value="">Select member</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.member_code})</option>)}
              </select>
            </div>
            {enrollments.length > 0 && (
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Enrollment (optional)</label>
                <select className="form-select" value={createForm.enrollment_id} onChange={e => setCreateForm(f => ({ ...f, enrollment_id: e.target.value }))}>
                  <option value="">No specific enrollment</option>
                  {enrollments.map(e => <option key={e.id} value={e.id}>{e.program_name} — {e.group_name || 'No group'}</option>)}
                </select>
              </div>
            )}
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Fee Plan</label>
              <select className="form-select" value={createForm.fee_plan_id} onChange={e => { const fp = feePlans.find(f => String(f.id) === e.target.value); setCreateForm(f => ({ ...f, fee_plan_id: e.target.value, original_amount: fp ? fp.amount : f.original_amount })); }}>
                <option value="">Custom / No plan</option>
                {feePlans.map(fp => <option key={fp.id} value={fp.id}>{fp.name} — ₹{parseFloat(fp.amount).toLocaleString()}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Billing Period Label <span className="required">*</span></label>
              <input className="form-control" value={createForm.billing_period_label} onChange={e => setCreateForm(f => ({ ...f, billing_period_label: e.target.value }))} required placeholder="e.g. October 2026, Q3 2026" />
            </div>
            <div className="form-group">
              <label className="form-label">Original Amount (₹) <span className="required">*</span></label>
              <input type="number" className="form-control" value={createForm.original_amount} onChange={e => setCreateForm(f => ({ ...f, original_amount: e.target.value }))} required min={0} step={0.01} />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date <span className="required">*</span></label>
              <input type="date" className="form-control" value={createForm.due_date} onChange={e => setCreateForm(f => ({ ...f, due_date: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Discount (₹)</label>
              <input type="number" className="form-control" value={createForm.discount_amount} onChange={e => setCreateForm(f => ({ ...f, discount_amount: e.target.value }))} min={0} step={0.01} />
            </div>
            <div className="form-group">
              <label className="form-label">Late Fee (₹)</label>
              <input type="number" className="form-control" value={createForm.late_fee_amount} onChange={e => setCreateForm(f => ({ ...f, late_fee_amount: e.target.value }))} min={0} step={0.01} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create Record'}</button>
          </div>
        </form>
      </Modal>

      {/* Collect Payment Modal */}
      <Modal show={showPayment} onClose={() => setShowPayment(false)} title="Collect Payment" size="sm">
        {selectedRecord && (
          <div>
            <div style={{ background: 'var(--color-bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
              <div style={{ fontWeight: 700 }}>{selectedRecord.member_name}</div>
              <div style={{ color: 'var(--color-text-secondary)' }}>{selectedRecord.billing_period_label}</div>
              <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                <span>Total: <strong>₹{parseFloat(selectedRecord.final_amount || 0).toLocaleString()}</strong></span>
                <span>Paid: <strong style={{ color: 'var(--color-success)' }}>₹{parseFloat(selectedRecord.amount_paid || 0).toLocaleString()}</strong></span>
                <span>Balance: <strong style={{ color: 'var(--color-danger)' }}>₹{parseFloat(selectedRecord.outstanding_balance || 0).toLocaleString()}</strong></span>
              </div>
            </div>
            <form onSubmit={handlePayment}>
              <div className="form-group">
                <label className="form-label">Amount (₹) <span className="required">*</span></label>
                <input type="number" className="form-control" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} required min={0.01} max={parseFloat(selectedRecord.outstanding_balance)} step={0.01} />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-select" value={payForm.payment_method} onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))}>
                  {PAY_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Date</label>
                <input type="date" className="form-control" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Transaction Reference</label>
                <input className="form-control" value={payForm.transaction_ref} onChange={e => setPayForm(f => ({ ...f, transaction_ref: e.target.value }))} placeholder="UPI ID, cheque no., etc." />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input className="form-control" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayment(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={submitting}>{submitting ? 'Recording…' : 'Record Payment'}</button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}
