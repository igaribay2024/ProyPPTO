import React, { useState, useEffect, useRef } from 'react';

const pretty = (r) => {
  const labelMap = {
    constructor: 'Constructor de Presupuesto',
    'constructor-inline': 'Constructor (inline)',
    gastos: 'Gastos Ejercidos',
    partidas: 'Partidas Presupuesto'
  };
  if (labelMap[r]) return labelMap[r];
  return r.charAt(0).toUpperCase() + r.slice(1);
};

export default function Menu({ resources = [], active, onSelect }) {
  // Persist menu open/closed state in localStorage so user preference survives reloads
  const [open, setOpen] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('menuOpen');
      if (saved !== null) setOpen(saved === 'true');
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('menuOpen', open ? 'true' : 'false');
    } catch (e) {
      // ignore
    }
  }, [open]);

  const styles = {
    wrap: { fontFamily: 'Inter, Roboto, sans-serif' },
    header: { display: 'flex', alignItems: 'center', marginBottom: 8 },
    toggleBtn: {
      background: 'transparent',
      border: '1px solid rgba(79,189,176,0.4)',
      borderRadius: 6,
      padding: '6px 8px',
      cursor: 'pointer',
      marginRight: 8,
      color: '#bfeae0',
    },
    title: { fontSize: 16, color: '#dcefe9' },
    container: {
      overflow: 'hidden',
      transition: 'max-height 280ms ease, opacity 280ms ease, transform 280ms ease',
      maxHeight: open ? 1000 : 0,
      opacity: open ? 1 : 0,
      transform: open ? 'translateX(0)' : 'translateX(-6px)',
    },
    list: { listStyle: 'none', padding: 0, margin: 0 },
    item: { marginBottom: 8 },
    btn: (isActive) => ({
      width: '100%',
      textAlign: 'left',
      padding: '8px 10px',
      background: isActive ? '#1f9a94' : '#2b3436',
      color: isActive ? '#fff' : '#cfe7e2',
      border: '1px solid rgba(79,189,176,0.25)',
      borderRadius: 6,
      cursor: 'pointer',
    }),
  };

  return (
    <nav style={styles.wrap}>
      <div style={styles.header}>
        <button
          aria-label={open ? 'Ocultar menú' : 'Mostrar menú'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={styles.toggleBtn}
        >
          {/* Toggle icon: hamburger ↔ close */}
          <span style={{ fontSize: 18, lineHeight: 1 }}>{open ? '✕' : '☰'}</span>
        </button>
        <strong style={styles.title}>Panel</strong>
      </div>

      <div ref={containerRef} style={styles.container}>
        <ul style={styles.list}>
          {resources.map((r) => (
            <li key={r} style={styles.item}>
              <button onClick={() => onSelect(r)} style={styles.btn(active === r)}>
                {pretty(r)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
