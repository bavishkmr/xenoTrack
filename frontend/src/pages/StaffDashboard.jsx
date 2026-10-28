import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../services';
import { BsCollectionFill, BsPeopleFill, BsCalendarCheckFill } from 'react-icons/bs';

const StatCard = ({ icon, label, value, sub }) => (
  <div className="stat-card">
    <div className="stat-card-header">
      <span className="stat-label">{label}</span>
      <span className="stat-icon">{icon}</span>
    </div>
    <div className="stat-value">{value ?? '—'}</div>
    {sub && <div className="stat-change" style={{ color: 'var(--color-text-secondary)', fontSize: '11.5px' }}>{sub}</div>}
  </div>
);

export default function StaffDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.getStaff()
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;
  if (!data) return <div className="alert alert-danger">Failed to load dashboard</div>;

  const { stats, assignedGroups, todaySessions, recentAttendance } = data;

  return (
    <div>
      <div className="grid grid-cols-3" style={{ marginBottom: 24 }}>
        <StatCard
          icon={<BsCollectionFill />}
          label="Assigned Groups"
          value={stats.assignedGroupsCount}
        />
        <StatCard
          icon={<BsPeopleFill />}
          label="Members Under You"
          value={stats.membersCount}
        />
        <StatCard
          icon={<BsCalendarCheckFill />}
          label="Today's Sessions"
          value={stats.todaySessionsCount}
        />
      </div>

      <div className="grid grid-cols-2">
        {/* Assigned Groups */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">My Groups</h3>
            <Link to="/groups" className="btn btn-sm btn-outline-primary">View All</Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Group</th><th>Program</th><th>Members</th></tr></thead>
              <tbody>
                {assignedGroups.map(g => (
                  <tr key={g.id}>
                    <td><Link to={`/groups/${g.id}`} className="link" style={{ fontWeight:600 }}>{g.name}</Link></td>
                    <td style={{ fontSize:12, color:'var(--color-text-secondary)' }}>{g.program_name}</td>
                    <td>{g.member_count}</td>
                  </tr>
                ))}
                {!assignedGroups.length && <tr><td colSpan={3}><div className="empty-state-desc" style={{ textAlign:'center', padding:16 }}>No groups assigned</div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Today's Sessions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Today's Sessions</h3>
            <Link to="/attendance" className="btn btn-sm btn-outline-primary">Mark Attendance</Link>
          </div>
          <div className="card-body">
            {todaySessions.length ? todaySessions.map(s => (
              <div key={s.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--color-border-light)' }}>
                <div>
                  <div style={{ fontWeight:600 }}>{s.group_name}</div>
                  <div style={{ fontSize:12, color:'var(--color-text-muted)' }}>{s.session_date}</div>
                </div>
                <Link to={`/attendance/mark/${s.id}`} className="btn btn-sm btn-primary">
                  {s.status === 'completed' ? 'View' : 'Mark'}
                </Link>
              </div>
            )) : (
              <div className="empty-state">
                <div className="empty-state-desc">No sessions today</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Attendance */}
      {recentAttendance.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header"><h3 className="card-title">Recent Attendance Records</h3></div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Date</th><th>Group</th><th>Present</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {recentAttendance.map((r, i) => (
                  <tr key={i}>
                    <td>{r.session_date}</td>
                    <td style={{ fontWeight:600 }}>{r.group_name}</td>
                    <td style={{ color:'var(--color-success)', fontWeight:700 }}>{r.present_count}</td>
                    <td>{r.total_count}</td>
                    <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
