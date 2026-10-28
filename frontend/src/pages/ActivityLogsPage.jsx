import React, { useEffect, useState, useCallback } from 'react';
import { settingsService } from '../services';
import { toast } from 'react-toastify';
import { BsSearch } from 'react-icons/bs';

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ search: '', from_date: '', to_date: '' });

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const r = await settingsService.getActivityLogs({ ...filters, page, limit: 50 });
      setLogs(r.data.data);
      setPagination(r.data.pagination || { total: r.data.data.length, page: 1, totalPages: 1 });
    } catch { toast.error('Failed to load logs'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(1); }, [load]);

  const actionColor = action => {
    if (!action) return '';
    const a = action.toLowerCase();
    if (a.includes('create') || a.includes('add')) return '#D1FAE5';
    if (a.includes('delete') || a.includes('remove') || a.includes('reverse')) return '#FEE2E2';
    if (a.includes('update') || a.includes('edit') || a.includes('change')) return '#FEF3C7';
    if (a.includes('login') || a.includes('logout')) return '#EEF2FF';
    return '#F1F5F9';
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="filters-row">
            <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
              <BsSearch className="search-icon" />
              <input className="form-control" placeholder="Search action, entity, user…" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>From</label>
              <input type="date" className="form-control" style={{ width: 145 }} value={filters.from_date} onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>To</label>
              <input type="date" className="form-control" style={{ width: 145 }} value={filters.to_date} onChange={e => setFilters(f => ({ ...f, to_date: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Activity Logs ({pagination.total})</h3></div>
        <div className="table-container">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> : !logs.length ? (
            <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">No activity logs found</div></div>
          ) : (
            <table className="table">
              <thead><tr><th>Date & Time</th><th>User</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>Details</th></tr></thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString()}</td>
                    <td style={{ fontWeight: 600 }}>{log.user_name || '—'}</td>
                    <td>
                      <span style={{ background: actionColor(log.action), padding: '2px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, display: 'inline-block' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, textTransform: 'capitalize' }}>{log.entity_type?.replace('_', ' ') || '—'}</td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{log.entity_id || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-secondary)', maxWidth: 200 }}>
                      {log.details ? (typeof log.details === 'string' ? log.details : JSON.stringify(log.details)).slice(0, 80) : '—'}
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
    </div>
  );
}
