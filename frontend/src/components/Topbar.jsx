import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BsList, BsBellFill, BsPersonCircle } from 'react-icons/bs';

const routeLabels = {
  '/dashboard':         'Dashboard',
  '/members':           'Members',
  '/programs':          'Programs',
  '/groups':            'Groups',
  '/staff':             'Staff',
  '/attendance':        'Attendance',
  '/fee-plans':         'Fee Plans',
  '/fee-records':       'Fee Records',
  '/payments':          'Payments',
  '/reports/attendance':'Attendance Report',
  '/reports/collections':'Collection Report',
  '/reports/outstanding':'Outstanding Fees',
  '/settings':          'Settings',
  '/settings/logs':     'Activity Logs',
  '/profile':           'My Profile',
};

export default function Topbar({ onMenuClick }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const label = Object.entries(routeLabels).find(([k]) => pathname.startsWith(k))?.[1] || 'Xenotrack';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="btn btn-icon btn-secondary"
          style={{ display:'none' }}
          id="mobile-menu-btn"
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <BsList size={20} />
        </button>
        <h1 className="page-title">{label}</h1>
      </div>
      <div className="topbar-right">
        <div style={{ textAlign:'right', marginRight:8 }}>
          <div style={{ fontSize:13, fontWeight:600 }}>{user?.full_name}</div>
          <div style={{ fontSize:11, color:'var(--color-text-muted)', textTransform:'capitalize' }}>{user?.role}</div>
        </div>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--color-primary-light)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--color-primary)', fontSize:20 }}>
          <BsPersonCircle />
        </div>
      </div>
    </header>
  );
}
