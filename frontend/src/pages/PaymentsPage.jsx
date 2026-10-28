import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { feeService } from '../services';
import { useAuth } from '../context/AuthContext';
import { BsSearch, BsReceiptCutoff, BsArrowCounterclockwise } from 'react-icons/bs';
import Modal from '../components/Modal';

const PAY_METHODS = ['cash','upi','bank_transfer','card','cheque','other'];

export default function PaymentsPage() {
  const { isAdmin } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ search: '', payment_method: '', from_date: '', to_date: '' });
  const [totalCollected, setTotalCollected] = useState(0);
  const [showReverse, setShowReverse] = useState(false);
  const [reverseTarget, setReverseTarget] = useState(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reversing, setReversing] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const r = await feeService.listPayments({ ...filters, page, limit: 25 });
      setPayments(r.data.data);
      setPagination(r.data.pagination || { total: r.data.data.length, page: 1, totalPages: 1 });
      setTotalCollected(r.data.totalCollected || 0);
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(1); }, [load]);

  const handleReverse = async e => {
    e.preventDefault(); setReversing(true);
    try { await feeService.reversePayment(reverseTarget.id, reverseReason); toast.success('Payment reversed'); setShowReverse(false); load(pagination.page); }
    catch (err) { toast.error(err.response?.data?.message || 'Reversal failed'); }
    finally { setReversing(false); }
  };

  const methodColor = m => ({ cash: 'badge-active', upi: 'badge-completed', bank_transfer: 'badge-completed', card: 'badge-completed', cheque: 'badge-pending', other: 'badge-pending' }[m] || 'badge-pending');

  return (
    <div>
      {/* Summary card */}
      <div className="stat-card" style={{ marginBottom: 20 }}>
        <div className="stat-icon icon-emerald"><BsReceiptCutoff /></div>
        <div className="stat-info">
          <div className="stat-value">₹{parseFloat(totalCollected || 0).toLocaleString()}</div>
          <div className="stat-label">Total Collected (filtered)</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="filters-row">
            <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
              <BsSearch className="search-icon" />
              <input className="form-control" placeholder="Search member, receipt number…" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
            </div>
            <select className="form-select" style={{ width: 160 }} value={filters.payment_method} onChange={e => setFilters(f => ({ ...f, payment_method: e.target.value }))}>
              <option value="">All Methods</option>
              {PAY_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
            <input type="date" className="form-control" style={{ width: 150 }} value={filters.from_date} onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))} />
            <input type="date" className="form-control" style={{ width: 150 }} value={filters.to_date} onChange={e => setFilters(f => ({ ...f, to_date: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Payments ({pagination.total})</h3></div>
        <div className="table-container">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> : !payments.length ? (
            <div className="empty-state"><div className="empty-state-icon">💳</div><div className="empty-state-title">No payments found</div></div>
          ) : (
            <table className="table">
              <thead><tr><th>Receipt #</th><th>Member</th><th>Period</th><th>Amount</th><th>Method</th><th>Date</th><th>Collected By</th><th>Actions</th></tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} style={{ opacity: p.is_reversed ? 0.55 : 1 }}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {p.receipt_number}
                      {p.is_reversed && <span className="badge badge-inactive" style={{ marginLeft: 6, fontSize: 10 }}>Reversed</span>}
                    </td>
                    <td>
                      <Link to={`/members/${p.member_id}`} className="link" style={{ fontWeight: 600 }}>{p.member_name}</Link>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.member_code}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>{p.billing_period_label}</td>
                    <td style={{ fontWeight: 700, color: p.is_reversed ? 'var(--color-text-muted)' : 'var(--color-success)' }}>₹{parseFloat(p.amount).toLocaleString()}</td>
                    <td><span className={`badge ${methodColor(p.payment_method)}`} style={{ textTransform: 'capitalize' }}>{p.payment_method?.replace('_', ' ')}</span></td>
                    <td style={{ fontSize: 12 }}>{p.payment_date}</td>
                    <td style={{ fontSize: 12 }}>{p.collected_by_name || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link to={`/payments/${p.id}/receipt`} className="btn btn-sm btn-secondary btn-icon" title="Receipt"><BsReceiptCutoff /></Link>
                        {isAdmin && !p.is_reversed && (
                          <button className="btn btn-sm btn-secondary btn-icon" title="Reverse" onClick={() => { setReverseTarget(p); setReverseReason(''); setShowReverse(true); }}><BsArrowCounterclockwise style={{ color: 'var(--color-danger)' }} /></button>
                        )}
                      </div>
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

      {/* Reverse Modal */}
      <Modal show={showReverse} onClose={() => setShowReverse(false)} title="Reverse Payment" size="sm">
        {reverseTarget && (
          <form onSubmit={handleReverse}>
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: '#991B1B' }}>⚠️ This action cannot be undone</div>
              <div style={{ marginTop: 4, color: '#B91C1C' }}>Reversing {reverseTarget.receipt_number} — ₹{parseFloat(reverseTarget.amount).toLocaleString()}</div>
            </div>
            <div className="form-group">
              <label className="form-label">Reason for Reversal <span className="required">*</span></label>
              <textarea className="form-control" value={reverseReason} onChange={e => setReverseReason(e.target.value)} required rows={2} placeholder="Explain the reason for reversing this payment" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowReverse(false)}>Cancel</button>
              <button type="submit" className="btn btn-danger" disabled={reversing}>{reversing ? 'Reversing…' : 'Confirm Reversal'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
