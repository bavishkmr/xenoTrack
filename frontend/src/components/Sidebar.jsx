import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BsSpeedometer2, BsPeople, BsBook, BsCollection,
  BsPersonBadge, BsCalendarCheck, BsCreditCard,
  BsReceiptCutoff, BsBarChart, BsGear, BsBoxArrowRight,
  BsShield, BsPersonCircle, BsClipboardCheck
} from 'react-icons/bs';

const adminNav = [
  { section: 'Overview', items: [
    { to: '/dashboard', icon: <BsSpeedometer2 />, label: 'Dashboard' },
  ]},
  { section: 'Directory', items: [
    { to: '/members', icon: <BsPeople />, label: 'Members' },
    { to: '/staff', icon: <BsPersonBadge />, label: 'Staff' },
  ]},
  { section: 'Academics', items: [
    { to: '/programs', icon: <BsBook />, label: 'Programs' },
    { to: '/groups', icon: <BsCollection />, label: 'Groups & Batches' },
    { to: '/attendance', icon: <BsCalendarCheck />, label: 'Attendance' },
  ]},
  { section: 'Billing', items: [
    { to: '/fee-plans', icon: <BsClipboardCheck />, label: 'Fee Plans' },
    { to: '/fee-records', icon: <BsReceiptCutoff />, label: 'Fee Records' },
    { to: '/payments', icon: <BsCreditCard />, label: 'Transactions' },
  ]},
  { section: 'Intelligence', items: [
    { to: '/reports/attendance', icon: <BsBarChart />, label: 'Attendance Report' },
    { to: '/reports/collections', icon: <BsBarChart />, label: 'Collections Report' },
    { to: '/reports/outstanding', icon: <BsBarChart />, label: 'Outstanding Dues' },
  ]},
  { section: 'Preferences', items: [
    { to: '/settings', icon: <BsGear />, label: 'Settings' },
    { to: '/settings/logs', icon: <BsShield />, label: 'Audit Trail' },
  ]},
];

const staffNav = [
  { section: 'Overview', items: [
    { to: '/dashboard', icon: <BsSpeedometer2 />, label: 'Dashboard' },
  ]},
  { section: 'My Work', items: [
    { to: '/groups', icon: <BsCollection />, label: 'My Groups' },
    { to: '/members', icon: <BsPeople />, label: 'Members' },
    { to: '/attendance', icon: <BsCalendarCheck />, label: 'Mark Attendance' },
  ]},
  { section: 'Finance', items: [
    { to: '/fee-records', icon: <BsReceiptCutoff />, label: 'Fee Records' },
    { to: '/payments', icon: <BsCreditCard />, label: 'Record Payment' },
  ]},
  { section: 'Account', items: [
    { to: '/profile', icon: <BsPersonCircle />, label: 'My Profile' },
  ]},
];

export default function Sidebar({ open, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const navItems = isAdmin ? adminNav : staffNav;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">X</div>
        <div>
          <div className="sidebar-brand-text">Xenotrack</div>
          <div className="sidebar-brand-sub">Management Suite</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ section, items }) => (
          <div key={section}>
            <div className="sidebar-section-label">{section}</div>
            {items.map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                onClick={onClose}
              >
                <span className="nav-item-icon">{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink
          to="/profile"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          onClick={onClose}
          style={{ marginBottom: '4px' }}
        >
          <span className="nav-item-icon"><BsPersonCircle /></span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.full_name || 'My Profile'}
          </span>
        </NavLink>
        <button
          className="nav-item"
          style={{
            width: '100%',
            border: 'none',
            background: 'none',
            color: '#EF4444',
            cursor: 'pointer'
          }}
          onClick={handleLogout}
        >
          <span className="nav-item-icon"><BsBoxArrowRight /></span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
