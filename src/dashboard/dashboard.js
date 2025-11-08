import React, { useState } from 'react';
import Menu from './Menu';
import ResourcePage from './ResourcePage';

const resources = [
  'presupuestos',
  'gastos',
  'usuarios',
  'conceptos',
  'cuentas',
  'partidas',
  'plantas',
  'constructor',
  'constructor-inline',
];

// Dashboard accepts an optional `user` prop (App passes it). We keep it available for future use.
export default function Dashboard({ user }) {
  // Show the presupuestal constructor embed immediately after login
  // so users see the chart on the main page by default.
  const [active, setActive] = useState('constructor');

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ width: 240, borderRight: '1px solid #ddd', padding: 12 }}>
        <h3>Panel</h3>
        <div style={{ fontSize: 12, marginBottom: 8 }}>Usuario: {user?.nombre || user?.name || 'Usuario'}</div>
        <Menu resources={resources} active={active} onSelect={setActive} />
      </div>
      <div style={{ flex: 1, padding: 12 }}>
        {active ? (
          active === 'constructor' ? (
            // lazy-load embed component only when selected
            React.createElement(require('./PresupuestalEmbed').default)
          ) : active === 'constructor-inline' ? (
            React.createElement(require('./PresupuestalInline').default)
          ) : (
            <ResourcePage resource={active} onBack={() => setActive(null)} />
          )
        ) : (
          <div>
            <h2>Bienvenido al Sistema de Control de Presupuestos de TI</h2>
            <p>Selecciona un módulo del menú para comenzar (Presupuestos, Gastos, Usuarios, Conceptos, Cuentas, Partidas, Plantas).</p>
          </div>
        )}
      </div>
    </div>
  );
}