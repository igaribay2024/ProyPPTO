import React from 'react';
import './Button3D.css';

export default function Button3D({ children, onClick, title }) {
  return (
    <button className="btn-3d" onClick={onClick} title={title}>
      <span className="btn-3d-label">{children}</span>
    </button>
  );
}
