import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import ToastProvider from './components/ToastProvider';
import Login from './components/Login';
import Welcome from './components/Welcome';
import ResetPassword from './components/ResetPassword';
import DashboardLayout from './dashboard/dashboard';
import DashboardHome from './dashboard/DashboardHome';
import ResourcePage from './dashboard/ResourcePage';
import GastosComponent from './components/Gastos';
import PresupuestosComponent from './components/Presupuestos';

function AppRoutes({ user, setUser }) {
  // redirect to /dashboard when user is present
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    // Only redirect to /dashboard on login if we're not already inside /dashboard
    // Run this effect only when `user` changes (avoids firing on every route change).
    if (user) {
      try {
        if (!location.pathname.startsWith('/dashboard')) {
          navigate('/dashboard', { replace: true });
        }
      } catch (e) {
        // ignore navigation errors during startup
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <Routes>
  <Route path="/reset" element={<ResetPassword />} />
      <Route path="/login" element={<Login setUser={setUser} />} />
      <Route path="/welcome" element={<Welcome user={user} onEnter={() => navigate('/dashboard')} setUser={setUser} />} />

      <Route
        path="/dashboard/*"
        element={user ? <DashboardLayout user={user} setUser={setUser} /> : <Navigate to="/login" replace />}
      >
  <Route index element={<DashboardHome />} />
  <Route path="presupuestos" element={<PresupuestosComponent />} />
  <Route path="gastos" element={<GastosComponent />} />
  <Route path="usuarios" element={<ResourcePage resource="usuarios" />} />
  <Route path="conceptos" element={<ResourcePage resource="conceptos" />} />
  <Route path="cuentas" element={<ResourcePage resource="cuentas" />} />
  <Route path="partidas" element={<ResourcePage resource="partidas" />} />
  <Route path="plantas" element={<ResourcePage resource="plantas" />} />
      </Route>

      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
      <Route path="*" element={<div style={{padding:12}}>Página no encontrada</div>} />
    </Routes>
  );
}

function OverlayGuard() {
  const location = useLocation();
  // show only on dashboard home (index)
  const showInicio = location && (location.pathname === '/dashboard' || location.pathname === '/dashboard/');
  if (!showInicio) return null;
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, backgroundImage: "url('/Fondo.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.2, pointerEvents: 'none', zIndex: 0 }} />
  );
}

function App() {
  const [user, setUser] = useState(null);

  // Inicializar sesión desde localStorage si existe y validar token
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          // if parsed contains token we validate it with backend
          const tokenCandidate = parsed?.token || parsed;
          if (tokenCandidate) {
            // call validateToken to get user info
            try {
              const { validateToken } = await import('./services/auth');
              const validated = await validateToken();
              if (mounted) setUser(validated || parsed?.user || parsed);
            } catch (err) {
              // invalid token -> clear stored and stay logged out
              try { localStorage.removeItem('user'); } catch(e){}
              if (mounted) setUser(null);
            }
          } else {
            const userObj = parsed?.user || (parsed?.email ? parsed : null);
            if (mounted) setUser(userObj);
          }
        }
      } catch (err) {
        // ignore
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  return (
    <BrowserRouter>
      <ToastProvider>
        {/* Decorative background only on Inicio (dashboard index) */}
        <OverlayGuard />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <AppRoutes user={user} setUser={setUser} />
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;