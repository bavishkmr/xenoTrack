import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BsList } from 'react-icons/bs';

const routeLabels = {
  '/dashboard':         'Dashboard',
  '/members':           'Members',
  '/programs':          'Programs',
  '/groups':            'Groups',
  '/staff':             'Staff Directory',
  '/attendance':        'Attendance Tracker',
  '/fee-plans':         'Fee Plans',
  '/fee-records':       'Fee Records',
  '/payments':          'Payments & Transactions',
  '/reports/attendance':'Attendance Report',
  '/reports/collections':'Collection Report',
  '/reports/outstanding':'Outstanding Balances',
  '/settings':          'Institute Settings',
  '/settings/logs':     'Audit Logs',
  '/profile':           'User Profile',
};

export default function Topbar({ onMenuClick }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const label = Object.entries(routeLabels).find(([k]) => pathname.startsWith(k))?.[1] || 'Overview';

  // Compute initials from user full name
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="btn btn-icon btn-secondary"
          style={{ display: 'none' }}
          id="mobile-menu-btn"
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <BsList size={18} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>Institute</span>
          <span style={{ fontSize: '12px', color: '#CBD5E1' }}>/</span>
          <h1 className="page-title">{label}</h1>
        </div>
      </div>

      <div className="topbar-right">
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', lineHeight: 1.2 }}>
            {user?.full_name || 'User'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'capitalize' }}>
            {user?.role || 'Staff'}
          </div>
        </div>

        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          backgroundColor: '#F1F5F9',
          border: '1px solid #CBD5E1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#0F172A',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.02em'
        }}>
          {initials}
        </div>
      </div>
    </header>
  );
}
