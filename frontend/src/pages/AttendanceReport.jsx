import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { reportService, programService } from '../services';
import { BsDownload, BsBarChartFill } from 'react-icons/bs';

function downloadCSV(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AttendanceReport() {
  const [groups, setGroups] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + '01';
  const [filters, setFilters] = useState({ from_date: monthStart, to_date: today, group_id: '', program_id: '', report_type: 'summary' });

  useEffect(() => {
    Promise.all([programService.listGroups({ status: 'active' }), programService.listPrograms({ status: 'active' })]).then(([g, p]) => { setGroups(g.data.data); setPrograms(p.data.data); });
  }, []);

  const run = async () => {
    setLoading(true);
    try { const r = await reportService.getAttendance(filters); setReport(r.data.data); }
    catch { toast.error('Failed to generate report'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title"><BsBarChartFill style={{ marginRight: 8 }} />Attendance Report</h3></div>
        <div className="card-body">
          <div className="filters-row">
            <select className="form-select" style={{ width: 160 }} value={filters.report_type} onChange={e => setFilters(f => ({ ...f, report_type: e.target.value }))}>
              <option value="summary">Summary</option>
              <option value="member">By Member</option>
              <option value="daily">Daily</option>
            </select>
            <select className="form-select" style={{ width: 180 }} value={filters.program_id} onChange={e => setFilters(f => ({ ...f, program_id: e.target.value }))}>
              <option value="">All Programs</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="form-select" style={{ width: 180 }} value={filters.group_id} onChange={e => setFilters(f => ({ ...f, group_id: e.target.value }))}>
              <option value="">All Groups</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>From</label>
              <input type="date" className="form-control" style={{ width: 145 }} value={filters.from_date} onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>To</label>
              <input type="date" className="form-control" style={{ width: 145 }} value={filters.to_date} onChange={e => setFilters(f => ({ ...f, to_date: e.target.value }))} />
            </div>
            <button className="btn btn-primary" onClick={run} disabled={loading}>{loading ? 'Loading…' : 'Generate'}</button>
            {report && <button className="btn btn-secondary" onClick={() => downloadCSV(report.rows || [], 'attendance-report.csv')}><BsDownload /> CSV</button>}
          </div>
        </div>
      </div>

      {report && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Results</h3>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{filters.from_date} to {filters.to_date}</div>
          </div>
          {report.summary && (
            <div style={{ display: 'flex', gap: 24, padding: '12px 20px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
              <div><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-success)' }}>{report.summary.present_count || 0}</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Present</div></div>
              <div><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-danger)' }}>{report.summary.absent_count || 0}</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Absent</div></div>
              <div><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-warning)' }}>{report.summary.late_count || 0}</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Late</div></div>
              <div><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary)' }}>{report.summary.attendance_pct || 0}%</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Rate</div></div>
            </div>
          )}
          <div className="table-container">
            {!report.rows?.length ? (
              <div className="empty-state"><div className="empty-state-desc">No data for selected period</div></div>
            ) : (
              <table className="table">
                <thead><tr>{Object.keys(report.rows[0]).map(k => <th key={k}>{k.replace(/_/g, ' ')}</th>)}</tr></thead>
                <tbody>
                  {report.rows.map((row, i) => (
                    <tr key={i}>{Object.values(row).map((v, j) => <td key={j} style={{ fontSize: 13 }}>{v ?? '—'}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
