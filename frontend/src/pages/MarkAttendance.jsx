import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { attendanceService } from '../services';
import { useAuth } from '../context/AuthContext';
import { BsCheckCircleFill, BsArrowLeft } from 'react-icons/bs';

const STATUSES = ['present', 'absent', 'late', 'excused'];
const STATUS_COLORS = { present: '#10B981', absent: '#EF4444', late: '#F59E0B', excused: '#7C3AED' };

export default function MarkAttendance() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await attendanceService.getSessionRecords(sessionId);
      setSession(r.data.data.session);
      const initialRecords = (r.data.data.members || []).map(m => ({
        member_id: m.member_id,
        full_name: m.full_name,
        member_code: m.member_code,
        attendance_record_id: m.attendance_record_id || null,
        status: m.status || 'present',
        notes: m.notes || '',
      }));
      setRecords(initialRecords);
    } catch { toast.error('Failed to load session'); navigate('/attendance'); }
    finally { setLoading(false); }
  }, [sessionId, navigate]);

  useEffect(() => { load(); }, [load]);

  const setStatus = (idx, status) => {
    setRecords(prev => prev.map((r, i) => i === idx ? { ...r, status } : r));
  };

  const setNotes = (idx, notes) => {
    setRecords(prev => prev.map((r, i) => i === idx ? { ...r, notes } : r));
  };

  const markAllPresent = () => setRecords(prev => prev.map(r => ({ ...r, status: 'present' })));

  const handleSave = async () => {
    setSaving(true);
    try {
      await attendanceService.saveBulk({ session_id: Number(sessionId), records });
      toast.success('Attendance saved successfully!');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleUpdateSingle = async (record) => {
    try {
      await attendanceService.updateRecord(record.attendance_record_id, { status: record.status, notes: record.notes });
      toast.success('Record updated'); setEditingId(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
  };

  const isCompleted = session?.status === 'completed';
  const canEdit = isAdmin || user?.can_edit_attendance;

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;
  if (!session) return null;

  const presentCount = records.filter(r => r.status === 'present').length;
  const totalCount = records.length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-secondary btn-icon" onClick={() => navigate('/attendance')}><BsArrowLeft /></button>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{session.group_name}</h2>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{session.session_date} · {session.program_name}</div>
        </div>
      </div>

      {/* Summary bar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-success)' }}>{presentCount}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Present</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-danger)' }}>{records.filter(r => r.status === 'absent').length}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Absent</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-warning)' }}>{records.filter(r => r.status === 'late').length}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Late</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#7C3AED' }}>{records.filter(r => r.status === 'excused').length}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Excused</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-primary)' }}>{totalCount ? Math.round((presentCount / totalCount) * 100) : 0}%</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Rate</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {!isCompleted && <button className="btn btn-secondary btn-sm" onClick={markAllPresent}>Mark All Present</button>}
            {isCompleted && canEdit && !editMode && <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(true)}>Edit Records</button>}
            {!isCompleted && (
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving…</> : <><BsCheckCircleFill /> Save Attendance</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Members list */}
      <div className="card">
        <div className="card-header"><h3 className="card-title">Members ({totalCount})</h3></div>
        {!totalCount ? (
          <div className="empty-state"><div className="empty-state-icon">👥</div><div className="empty-state-title">No members in this group</div></div>
        ) : (
          <div>
            {records.map((record, idx) => {
              const isEditing = editMode && editingId === record.member_id;
              return (
                <div key={record.member_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--color-border-light)', flexWrap: 'wrap' }}>
                  {/* Member info */}
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 600 }}>{record.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{record.member_code}</div>
                  </div>

                  {/* Status buttons */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {STATUSES.map(s => (
                      <button
                        key={s}
                        type="button"
                        disabled={isCompleted && !isEditing}
                        onClick={() => setStatus(idx, s)}
                        className={`att-btn ${s}${record.status === s ? ' selected' : ''}`}
                        style={{ opacity: isCompleted && !isEditing ? 0.7 : 1 }}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Notes */}
                  <input
                    className="form-control"
                    style={{ width: 160, fontSize: 12 }}
                    placeholder="Notes (optional)"
                    value={record.notes}
                    onChange={e => setNotes(idx, e.target.value)}
                    disabled={isCompleted && !isEditing}
                  />

                  {/* Edit/Save single record */}
                  {isCompleted && canEdit && (
                    editingId === record.member_id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-primary" onClick={() => handleUpdateSingle(record)}>Save</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => { setEditingId(null); load(); }}>Cancel</button>
                      </div>
                    ) : (
                      <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(record.member_id)}>Edit</button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom save */}
      {!isCompleted && records.length > 5 && (
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Attendance'}
          </button>
        </div>
      )}
    </div>
  );
}
