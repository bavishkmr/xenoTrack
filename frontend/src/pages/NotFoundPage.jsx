import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 96, fontWeight: 900, color: 'var(--color-primary-light)', lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '12px 0 8px', color: 'var(--color-text)' }}>Page Not Found</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24, fontSize: 15 }}>The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/dashboard" className="btn btn-primary btn-lg">Go to Dashboard</Link>
      </div>
    </div>
  );
}
