import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { reportService } from '../services';
import { BsDownload, BsBarChartFill, BsExclamationTriangleFill } from 'react-icons/bs';

function downloadCSV(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function OutstandingReport() {
  const [filters, setFilters] = useState({ status: '' });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try { const r = await reportService.getOutstanding(filters); setReport(r.data.data); }
    catch { toast.error('Failed to generate report'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title"><BsBarChartFill style={{ marginRight: 8 }} />Outstanding Fees Report</h3></div>
        <div className="card-body">
          <div className="filters-row">
            <select className="form-select" style={{ width: 180 }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="">All Outstanding</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            <button className="btn btn-primary" onClick={run} disabled={loading}>{loading ? 'Loading…' : 'Generate'}</button>
            {report && <button className="btn btn-secondary" onClick={() => downloadCSV(report.rows || [], 'outstanding-fees.csv')}><BsDownload /> CSV</button>}
          </div>
        </div>
      </div>

      {report && (
        <div>
          {/* Summary stats */}
          <div className="grid grid-cols-3" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-icon icon-red"><BsExclamationTriangleFill /></div>
              <div className="stat-info">
                <div className="stat-value">{report.totalRecords}</div>
                <div className="stat-label">Outstanding Records</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon icon-orange"><BsExclamationTriangleFill /></div>
              <div className="stat-info">
                <div className="stat-value">₹{parseFloat(report.totalOutstanding || 0).toLocaleString()}</div>
                <div className="stat-label">Total Outstanding</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon icon-red"><BsExclamationTriangleFill /></div>
              <div className="stat-info">
                <div className="stat-value">{report.overdueCount}</div>
                <div className="stat-label">Overdue Records</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="card-title">Outstanding Fee Records ({report.rows?.length || 0})</h3></div>
            <div className="table-container">
              {!report.rows?.length ? (
                <div className="empty-state"><div className="empty-state-icon">✅</div><div className="empty-state-title">No outstanding fees!</div><div className="empty-state-desc">All fee records are paid or waived.</div></div>
              ) : (
                <table className="table">
                  <thead><tr><th>Member</th><th>Phone</th><th>Period</th><th>Total</th><th>Paid</th><th>Outstanding</th><th>Due Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {report.rows.map(r => (
                      <tr key={r.fee_record_id}>
                        <td>
                          <Link to={`/members/${r.member_id}`} className="link" style={{ fontWeight: 600 }}>{r.member_name}</Link>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.member_code}</div>
                        </td>
                        <td style={{ fontSize: 13 }}>{r.phone || '—'}</td>
                        <td style={{ fontSize: 13 }}>{r.billing_period_label}</td>
                        <td>₹{parseFloat(r.final_amount || 0).toLocaleString()}</td>
                        <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>₹{parseFloat(r.amount_paid || 0).toLocaleString()}</td>
                        <td style={{ color: 'var(--color-danger)', fontWeight: 700 }}>₹{parseFloat(r.outstanding_balance || 0).toLocaleString()}</td>
                        <td style={{ fontSize: 12 }}>{r.due_date}</td>
                        <td><span className={`badge badge-${r.status}`} style={{ textTransform: 'capitalize' }}>{r.status?.replace('_', ' ')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
