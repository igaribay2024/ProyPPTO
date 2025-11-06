import React from 'react';

const pretty = (r) => {
  return r.charAt(0).toUpperCase() + r.slice(1);
};

export default function Menu({ resources = [], active, onSelect }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {resources.map((r) => (
        <li key={r} style={{ marginBottom: 8 }}>
          <button
            onClick={() => onSelect(r)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 10px',
              background: active === r ? '#1976d2' : '#fff',
              color: active === r ? '#fff' : '#333',
              border: '1px solid #ccc',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {pretty(r)}
          </button>
        </li>
      ))}
    </ul>
  );
}
