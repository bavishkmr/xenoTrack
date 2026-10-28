import React from 'react';
import { BsX } from 'react-icons/bs';

export default function Modal({ show, onClose, title, children, size = '' }) {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal${size ? ` modal-${size}` : ''}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:4, color:'var(--color-text-secondary)', fontSize:20, display:'flex' }}>
            <BsX />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
