import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../services';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { BsPeopleFill, BsPersonBadgeFill, BsCollectionFill, BsCalendarCheckFill,
  BsCreditCardFill, BsExclamationTriangleFill, BsClockFill, BsCheckCircleFill } from 'react-icons/bs';

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

const COLORS = ['#2563EB','#15803D','#B45309','#B91C1C','#0284C7'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.getAdmin()
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;
  if (!data) return <div className="alert alert-danger">Failed to load dashboard</div>;

  const { stats, recentPayments, recentMembers, charts } = data;

  return (
    <div>
      {/* Stats Grid */}
      <div className="grid grid-cols-4" style={{ marginBottom: 24 }}>
        <StatCard icon={<BsPeopleFill />}         label="Active Members"      value={stats.totalMembers}    color="icon-purple" />
        <StatCard icon={<BsPersonBadgeFill />}    label="Staff"               value={stats.totalStaff}      color="icon-blue" />
        <StatCard icon={<BsCollectionFill />}     label="Active Groups"       value={stats.totalGroups}     color="icon-green" />
        <StatCard icon={<BsCalendarCheckFill />}  label="Today's Attendance"  value={stats.todayAttendance} color="icon-sky"
          sub={`${stats.attendancePct}% attendance rate`} />
        <StatCard icon={<BsCreditCardFill />}     label="Collected This Month"
          value={`₹${(stats.feesCollectedThisMonth||0).toLocaleString()}`} color="icon-emerald" />
        <StatCard icon={<BsClockFill />}          label="Pending Fees"
          value={`₹${(stats.pendingFees||0).toLocaleString()}`}           color="icon-orange" />
        <StatCard icon={<BsExclamationTriangleFill />} label="Overdue Records" value={stats.overdueCount}  color="icon-red" />
        <StatCard icon={<BsCheckCircleFill />}    label="Attendance %"
          value={`${stats.attendancePct}%`}                                color="icon-violet" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2" style={{ marginBottom: 24 }}>
        {/* Monthly Collection */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Monthly Fee Collection (₹)</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={charts.monthlyCollection}>
                <defs>
                  <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4F46E5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
                <Area type="monotone" dataKey="total" stroke="#4F46E5" fill="url(#colGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Trend */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Attendance Trend (7 days)</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d?.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" name="Present" fill="#10B981" radius={[4,4,0,0]} />
                <Bar dataKey="total"   name="Total"   fill="#C7D2FE" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Fee breakdown + Recent tables */}
      <div className="grid grid-cols-2">
        {/* Fee Status pie */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Fee Status Distribution</h3></div>
          <div className="card-body" style={{ display:'flex', alignItems:'center', gap: 24 }}>
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={charts.feeBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${Math.round(percent*100)}%`} labelLine={false}>
                  {charts.feeBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {charts.feeBreakdown.map((item, i) => (
                <div key={item.status} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background: COLORS[i%COLORS.length], flexShrink:0 }} />
                  <span style={{ flex:1, fontSize:12, textTransform:'capitalize' }}>{item.status.replace('_',' ')}</span>
                  <span style={{ fontWeight:700, fontSize:13 }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Payments</h3>
            <Link to="/payments" className="btn btn-sm btn-outline-primary">View All</Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Member</th><th>Amount</th><th>Date</th></tr></thead>
              <tbody>
                {recentPayments.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight:600 }}>{p.member_name}</div>
                      <div style={{ fontSize:11, color:'var(--color-text-muted)' }}>{p.member_code}</div>
                    </td>
                    <td style={{ fontWeight:700, color:'var(--color-success)' }}>₹{parseFloat(p.amount).toLocaleString()}</td>
                    <td style={{ fontSize:12, color:'var(--color-text-secondary)' }}>{p.payment_date}</td>
                  </tr>
                ))}
                {!recentPayments.length && <tr><td colSpan={3}><div className="empty-state"><div className="empty-state-desc">No payments yet</div></div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Members */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Recent Registrations</h3>
          <Link to="/members" className="btn btn-sm btn-outline-primary">View All</Link>
        </div>
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Member</th><th>Phone</th><th>Registration Date</th><th>Status</th></tr></thead>
            <tbody>
              {recentMembers.map(m => (
                <tr key={m.id}>
                  <td>
                    <Link to={`/members/${m.id}`} className="link" style={{ fontWeight:600 }}>{m.full_name}</Link>
                    <div style={{ fontSize:11, color:'var(--color-text-muted)' }}>{m.member_code}</div>
                  </td>
                  <td>{m.phone || '—'}</td>
                  <td style={{ fontSize:12 }}>{m.registration_date}</td>
                  <td><span className={`badge badge-${m.status}`} style={{ textTransform:'capitalize' }}>{m.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
