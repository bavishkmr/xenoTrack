import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BsSpeedometer2, BsPeopleFill, BsBookFill, BsCollectionFill,
  BsPersonBadgeFill, BsCalendarCheckFill, BsCreditCardFill,
  BsReceiptCutoff, BsBarChartFill, BsGearFill, BsBoxArrowRight,
  BsShieldFill, BsPersonCircle, BsClipboardDataFill
} from 'react-icons/bs';

const adminNav = [
  { section: 'Overview', items: [
    { to: '/dashboard', icon: <BsSpeedometer2 />, label: 'Dashboard' },
  ]},
  { section: 'People', items: [
    { to: '/members', icon: <BsPeopleFill />, label: 'Members' },
    { to: '/staff', icon: <BsPersonBadgeFill />, label: 'Staff' },
  ]},
  { section: 'Programmes', items: [
    { to: '/programs', icon: <BsBookFill />, label: 'Programs' },
    { to: '/groups', icon: <BsCollectionFill />, label: 'Groups' },
  ]},
  { section: 'Attendance', items: [
    { to: '/attendance', icon: <BsCalendarCheckFill />, label: 'Attendance' },
  ]},
  { section: 'Finance', items: [
    { to: '/fee-plans', icon: <BsClipboardDataFill />, label: 'Fee Plans' },
    { to: '/fee-records', icon: <BsReceiptCutoff />, label: 'Fee Records' },
    { to: '/payments', icon: <BsCreditCardFill />, label: 'Payments' },
  ]},
  { section: 'Reports', items: [
    { to: '/reports/attendance', icon: <BsBarChartFill />, label: 'Attendance Report' },
    { to: '/reports/collections', icon: <BsBarChartFill />, label: 'Collection Report' },
    { to: '/reports/outstanding', icon: <BsBarChartFill />, label: 'Outstanding Fees' },
  ]},
  { section: 'System', items: [
    { to: '/settings', icon: <BsGearFill />, label: 'Settings' },
    { to: '/settings/logs', icon: <BsShieldFill />, label: 'Activity Logs' },
  ]},
];

const staffNav = [
  { section: 'Overview', items: [
    { to: '/dashboard', icon: <BsSpeedometer2 />, label: 'Dashboard' },
  ]},
  { section: 'Work', items: [
    { to: '/groups', icon: <BsCollectionFill />, label: 'My Groups' },
    { to: '/members', icon: <BsPeopleFill />, label: 'Members' },
    { to: '/attendance', icon: <BsCalendarCheckFill />, label: 'Attendance' },
  ]},
  { section: 'Finance', items: [
    { to: '/fee-records', icon: <BsReceiptCutoff />, label: 'Fee Records' },
    { to: '/payments', icon: <BsCreditCardFill />, label: 'Payments' },
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
          <div className="sidebar-brand-sub">Institute Manager</div>
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
        <NavLink to="/profile" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
          <span className="nav-item-icon"><BsPersonCircle /></span>
          <span style={{ flex: 1 }}>{user?.full_name || 'Profile'}</span>
        </NavLink>
        <button className="nav-item" style={{ width:'100%', border:'none', background:'none' }} onClick={handleLogout}>
          <span className="nav-item-icon"><BsBoxArrowRight /></span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
