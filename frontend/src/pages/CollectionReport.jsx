import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { reportService } from '../services';
import { BsDownload, BsBarChartFill, BsCashCoin } from 'react-icons/bs';

const PAY_METHODS = ['cash','upi','bank_transfer','card','cheque','other'];

function downloadCSV(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function CollectionReport() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + '01';
  const [filters, setFilters] = useState({ from_date: monthStart, to_date: today, payment_method: '' });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try { const r = await reportService.getCollections(filters); setReport(r.data.data); }
    catch { toast.error('Failed to generate report'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title"><BsBarChartFill style={{ marginRight: 8 }} />Collection Report</h3></div>
        <div className="card-body">
          <div className="filters-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>From</label>
              <input type="date" className="form-control" style={{ width: 145 }} value={filters.from_date} onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>To</label>
              <input type="date" className="form-control" style={{ width: 145 }} value={filters.to_date} onChange={e => setFilters(f => ({ ...f, to_date: e.target.value }))} />
            </div>
            <select className="form-select" style={{ width: 180 }} value={filters.payment_method} onChange={e => setFilters(f => ({ ...f, payment_method: e.target.value }))}>
              <option value="">All Methods</option>
              {PAY_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
            <button className="btn btn-primary" onClick={run} disabled={loading}>{loading ? 'Loading…' : 'Generate'}</button>
            {report && <button className="btn btn-secondary" onClick={() => downloadCSV(report.daily || [], 'collection-report.csv')}><BsDownload /> CSV</button>}
          </div>
        </div>
      </div>

      {report && (
        <div>
          {/* Grand Total */}
          <div className="stat-card" style={{ marginBottom: 20 }}>
            <div className="stat-icon icon-emerald"><BsCashCoin /></div>
            <div className="stat-info">
              <div className="stat-value">₹{parseFloat(report.grandTotal || 0).toLocaleString()}</div>
              <div className="stat-label">Total Collected — {filters.from_date} to {filters.to_date}</div>
              <div className="stat-change" style={{ color: 'var(--color-text-muted)' }}>{report.totalPayments} payments</div>
            </div>
          </div>

          <div className="grid grid-cols-2">
            {/* By Method */}
            <div className="card">
              <div className="card-header"><h3 className="card-title">By Payment Method</h3></div>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Method</th><th>Count</th><th>Total</th></tr></thead>
                  <tbody>
                    {(report.byMethod || []).map(r => (
                      <tr key={r.payment_method}>
                        <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{r.payment_method?.replace('_', ' ')}</td>
                        <td>{r.count}</td>
                        <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>₹{parseFloat(r.total).toLocaleString()}</td>
                      </tr>
                    ))}
                    {!report.byMethod?.length && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Staff */}
            <div className="card">
              <div className="card-header"><h3 className="card-title">By Staff</h3></div>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Staff</th><th>Count</th><th>Total</th></tr></thead>
                  <tbody>
                    {(report.byStaff || []).map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{r.collected_by_name || 'Unknown'}</td>
                        <td>{r.count}</td>
                        <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>₹{parseFloat(r.total).toLocaleString()}</td>
                      </tr>
                    ))}
                    {!report.byStaff?.length && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Daily breakdown */}
          {report.daily?.length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-header"><h3 className="card-title">Daily Breakdown</h3></div>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Date</th><th>Payments</th><th>Total Collected</th></tr></thead>
                  <tbody>
                    {report.daily.map(d => (
                      <tr key={d.date}>
                        <td style={{ fontWeight: 600 }}>{d.date}</td>
                        <td>{d.count}</td>
                        <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>₹{parseFloat(d.total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
