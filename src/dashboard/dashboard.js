import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import PaidIcon from '@mui/icons-material/Paid';
import PeopleIcon from '@mui/icons-material/People';
import CategoryIcon from '@mui/icons-material/Category';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ApartmentIcon from '@mui/icons-material/Apartment';
import '../styles/layout.css';

const items = [
  { key: 'presupuestos', label: 'Presupuestos' },
  { key: 'gastos', label: 'Gastos' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'conceptos', label: 'Conceptos' },
  { key: 'cuentas', label: 'Cuentas' },
  { key: 'partidas', label: 'Partidas' },
  { key: 'plantas', label: 'Plantas' }
];

export default function DashboardLayout({ user, setUser }) {
  const navigate = useNavigate();

  function handleLogout() {
    try { localStorage.removeItem('user'); } catch (e) {}
    try { if (typeof setUser === 'function') setUser(null); } catch (e) {}
    // navigate to login page
    navigate('/login', { replace: true });
    // ensure a full reload in case some state persisted
    try { window.location.href = '/login'; } catch (e) {}
  }
  return (
    <div className="layout-root">
      <aside className="layout-sidebar">
        <div className="layout-brand">
          <h3>Panel</h3>
          <div className="layout-user">{user?.nombre || user?.name || 'Usuario'}</div>
        </div>

        <nav className="layout-nav">
          {items.map(i => {
            let Icon = null;
            switch (i.key) {
              case 'presupuestos': Icon = HomeWorkIcon; break;
              case 'gastos': Icon = PaidIcon; break;
              case 'usuarios': Icon = PeopleIcon; break;
              case 'conceptos': Icon = CategoryIcon; break;
              case 'cuentas': Icon = AccountBalanceWalletIcon; break;
              case 'partidas': Icon = ListAltIcon; break;
              case 'plantas': Icon = ApartmentIcon; break;
              default: Icon = null;
            }
            return (
              <NavLink
                className={({ isActive }) => `layout-link ${isActive ? 'active' : ''}`}
                to={`/dashboard/${i.key}`}
                key={i.key}
              >
                {Icon ? <Icon style={{ marginRight: 8, verticalAlign: 'middle', color: 'inherit' }} /> : null}
                {i.label}
              </NavLink>
            );
          })}
        </nav>
        <div style={{ marginTop: 18 }}>
          <button className="layout-logout" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </aside>

      <main className="layout-content">
        <div className="layout-header">
          <h2>Bienvenido al Sistema de Control de Presupuestos</h2>
          <p>Selecciona un módulo del menú izquierdo para comenzar.</p>
        </div>

        <div className="layout-main">
          {/* nested routes will render here */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
