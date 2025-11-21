import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import PaidIcon from '@mui/icons-material/Paid';
import PeopleIcon from '@mui/icons-material/People';
import CategoryIcon from '@mui/icons-material/Category';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ApartmentIcon from '@mui/icons-material/Apartment';
import '../styles/layout.css';
import gpaxImg from '../assets/gpax.jpg';
import { useEffect, useState } from 'react';
import resourceService from '../services/resourceService';

const items = [
  { key: 'presupuestos', label: 'Presupuestos' },
  { key: 'gastos', label: 'Gastos Ejercidos' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'conceptos', label: 'Conceptos' },
  { key: 'cuentas', label: 'Cuentas' },
  { key: 'partidas', label: 'Partidas Presupuesto' },
  { key: 'plantas', label: 'Plantas' }
];

export default function DashboardLayout({ user, setUser }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [sidebarHidden, setSidebarHidden] = React.useState(() => {
    try { return localStorage.getItem('sidebarBannersHidden') === '1'; } catch (e) { return false; }
  });
  const [lastRefresh, setLastRefresh] = useState(null);
  const prevBannersRef = React.useRef([]);

  function handleLogout() {
    try { localStorage.removeItem('user'); } catch (e) {}
    try { if (typeof setUser === 'function') setUser(null); } catch (e) {}
    // navigate to login page
    navigate('/login', { replace: true });
    // ensure a full reload in case some state persisted
    try { window.location.href = '/login'; } catch (e) {}
  }
  const [banners, setBanners] = useState([]);
  const [alertBanners, setAlertBanners] = useState([]);

  // Get current dashboard filters from localStorage (shared with DashboardHome)
  const getDashboardFilters = () => {
    try {
      const filters = JSON.parse(localStorage.getItem('dashboardFilters') || '{}');
      return {
        selectedMonths: filters.selectedMonths || ['todas'],
        selectedCuentas: filters.selectedCuentas || ['todas'],
        selectedPlantas: filters.selectedPlantas || ['todas'],
        year: filters.year || new Date().getFullYear()
      };
    } catch (e) {
      return {
        selectedMonths: ['todas'],
        selectedCuentas: ['todas'], 
        selectedPlantas: ['todas'],
        year: new Date().getFullYear()
      };
    }
  };

  useEffect(() => {
    let mounted = true;

    // Helper: robustly determine record month/year from multiple possible fields
    const inferMonthYear = (rec, dateFields = []) => {
      // prefer explicit numeric fields 'mes' or 'month'
      const rawMonth = rec.mes ?? rec.month ?? rec.mes_partida ?? rec.mes_gasto;
      const rawYear = rec.anno ?? rec.year ?? rec.anio;
      const parsedMonth = rawMonth === undefined || rawMonth === null ? null : Number(rawMonth);
      const parsedYear = rawYear === undefined || rawYear === null ? null : Number(rawYear);

      // Handle common formats:
      // - 1..12 => month
      // - 0..11 => zero-based month (convert to 1..12)
      if (Number.isFinite(parsedMonth)) {
        if (parsedMonth >= 1 && parsedMonth <= 12) return { month: parsedMonth, year: Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear() };
        if (parsedMonth >= 0 && parsedMonth <= 11) return { month: parsedMonth + 1, year: Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear() };
      }

      // fallback to provided date-like fields
      for (const f of dateFields) {
        const ds = rec[f];
        if (!ds) continue;
        try {
          const d = new Date(ds);
          if (!Number.isNaN(d.getTime())) return { month: d.getMonth() + 1, year: d.getFullYear() };
        } catch (e) { /* ignore */ }
      }

      // final fallback: try generic candidate fields that may contain a date
      const candidates = [rec.fecha_ini, rec.fecha_partida, rec.fecha_gasto, rec.fecha];
      for (const c of candidates) {
        if (!c) continue;
        try {
          const d = new Date(c);
          if (!Number.isNaN(d.getTime())) return { month: d.getMonth() + 1, year: d.getFullYear() };
        } catch (e) {}
      }

      return { month: null, year: null };
    };

    async function loadBannerData() {
      try {
        // force fresh lists; resourceService.list already appends a cache-busting param but keep defensive coding here
        const [gastosRes, partidasRes, cuentasRes] = await Promise.all([
          resourceService.list('gastos'),
          resourceService.list('partidas'),
          resourceService.list('cuentas')
        ]);

        const gastos = Array.isArray(gastosRes) ? gastosRes : (gastosRes?.data || []);
        const partidas = Array.isArray(partidasRes) ? partidasRes : (partidasRes?.data || []);
        const cuentas = Array.isArray(cuentasRes) ? cuentasRes : (cuentasRes?.data || []);

        const getCuentaId = (r) => r.idcuenta ?? r.id_cuenta ?? r.cuenta_id ?? r.idCuenta ?? r.cuenta ?? 'sin_cuenta';
        const getPlantaId = (r) => r.idplanta ?? r.id_planta ?? r.planta_id ?? r.idPlanta ?? 'sin_planta';

        const filters = getDashboardFilters();
        const current = new Date();
        const currentMonth = current.getMonth() + 1;
        const currentYear = current.getFullYear();
        
        // Use filter year if specified, otherwise current year
        const targetYear = filters.year || currentYear;

        const partidasByCuenta = Object.create(null);
        for (const p of partidas) {
          const { month, year } = inferMonthYear(p, ['fecha_ini', 'fecha_partida', 'fecha']);
          
          // Apply year filter
          if ((year || currentYear) !== targetYear) continue;
          
          // Apply month filter
          if (filters.selectedMonths && !(filters.selectedMonths.includes('todas') || filters.selectedMonths.length === 0)) {
            if (!filters.selectedMonths.map(String).includes(String(month))) continue;
          }
          
          // Apply cuenta filter
          const cuentaId = String(getCuentaId(p) ?? 'sin_cuenta');
          if (filters.selectedCuentas && !(filters.selectedCuentas.includes('todas') || filters.selectedCuentas.length === 0)) {
            if (!filters.selectedCuentas.map(String).includes(cuentaId)) continue;
          }
          
          // Apply planta filter
          const plantaId = String(getPlantaId(p) ?? 'sin_planta');
          if (filters.selectedPlantas && !(filters.selectedPlantas.includes('todas') || filters.selectedPlantas.length === 0)) {
            if (!filters.selectedPlantas.map(String).includes(plantaId)) continue;
          }
          
          const val = Number(p.monto_base ?? p.monto ?? p.importe ?? 0) || 0;
          partidasByCuenta[cuentaId] = (partidasByCuenta[cuentaId] || 0) + val;
        }

        const gastosByCuenta = Object.create(null);
        for (const g of gastos) {
          const { month, year } = inferMonthYear(g, ['fecha', 'fecha_gasto']);
          
          // Apply year filter
          if ((year || currentYear) !== targetYear) continue;
          
          // Apply month filter
          if (filters.selectedMonths && !(filters.selectedMonths.includes('todas') || filters.selectedMonths.length === 0)) {
            if (!filters.selectedMonths.map(String).includes(String(month))) continue;
          }
          
          // Apply cuenta filter
          const cuentaId = String(getCuentaId(g) ?? 'sin_cuenta');
          if (filters.selectedCuentas && !(filters.selectedCuentas.includes('todas') || filters.selectedCuentas.length === 0)) {
            if (!filters.selectedCuentas.map(String).includes(cuentaId)) continue;
          }
          
          // Apply planta filter
          const plantaId = String(getPlantaId(g) ?? 'sin_planta');
          if (filters.selectedPlantas && !(filters.selectedPlantas.includes('todas') || filters.selectedPlantas.length === 0)) {
            if (!filters.selectedPlantas.map(String).includes(plantaId)) continue;
          }
          
          const val = Number(g.monto_base ?? g.monto ?? g.importe ?? g.amount ?? 0) || 0;
          gastosByCuenta[cuentaId] = (gastosByCuenta[cuentaId] || 0) + val;
        }

        const cuentaMap = {};
        for (const c of cuentas) {
          const id = String(c.idcuenta ?? c.id ?? c.value ?? c.idCuenta ?? 'sin_cuenta');
          cuentaMap[id] = c.nombre ?? c.descripcion ?? c.name ?? `Cuenta ${id}`;
        }

        // Development debug: log per-account totals and applied filters
        try {
          if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
            const samplePartidas = Object.entries(partidasByCuenta).slice(0,10).map(([id,val]) => ({ id, label: cuentaMap[id]||id, partidas: val }));
            const sampleGastos = Object.entries(gastosByCuenta).slice(0,10).map(([id,val]) => ({ id, label: cuentaMap[id]||id, gastos: val }));
            console.debug('[banner-debug] Applied filters:', filters);
            console.debug('[banner-debug] targetYear:', targetYear, 'currentMonth:', currentMonth);
            console.debug('[banner-debug] partidasByCuenta sample:', samplePartidas);
            console.debug('[banner-debug] gastosByCuenta sample:', sampleGastos);
          }
        } catch (e) { /* ignore logging errors */ }

        // Apply business rules deterministically and build banner messages
        const today = new Date();
        const day = today.getDate();

        const redAccounts = [];
        const yellowAccounts = [];
        const urgentAccounts = [];
        const limitAccounts = [];

        const allIds = new Set([...Object.keys(partidasByCuenta), ...Object.keys(gastosByCuenta)]);
        for (const id of allIds) {
          const partidasTotal = Number(partidasByCuenta[id] || 0) || 0;
          const gastosTotal = Number(gastosByCuenta[id] || 0) || 0;
          const pct = partidasTotal > 0 ? (gastosTotal / partidasTotal) : (gastosTotal > 0 ? Infinity : 0);
          const label = cuentaMap[id] ?? id;

          // rules (kept same thresholds, but applied consistently)
          if (day < 10) {
            if (pct < 0.5) redAccounts.push({ name: label, pct, gastos: gastosTotal, partidas: partidasTotal });
          } else if (day >= 11 && day <= 18) {
            if (pct < 0.7) yellowAccounts.push({ name: label, pct, gastos: gastosTotal, partidas: partidasTotal });
            if (pct > 0.9) redAccounts.push({ name: label, pct, gastos: gastosTotal, partidas: partidasTotal });
          } else if (day >= 19) {
            if (pct < 0.8) urgentAccounts.push({ name: label, pct, gastos: gastosTotal, partidas: partidasTotal });
            if (pct > 0.95) limitAccounts.push({ name: label, pct, gastos: gastosTotal, partidas: partidasTotal });
          }
        }

        const fmt = (p) => (p === Infinity ? '∞%' : `${(p * 100).toFixed(1)}%`);
        const msgs = [];
        if (redAccounts.length && day < 10) {
          msgs.push({ type: 'red', title: 'NO SE HA EJERCIDO LO SUFICIENTE EN LAS CUENTAS', items: redAccounts.map(a => ({ name: a.name, pct: fmt(a.pct), gastos: a.gastos, partidas: a.partidas })) });
        }
        if (yellowAccounts.length && day >= 11 && day <= 18) {
          for (const acc of yellowAccounts) msgs.push({ type: 'yellow', title: `LA CUENTA ${acc.name} NO HA SUPERADO EL 70% DEL GASTO ESTIMADO`, items: [{ name: acc.name, pct: fmt(acc.pct), gastos: acc.gastos, partidas: acc.partidas }] });
        }
        if (redAccounts.length && day >= 11 && day <= 18) {
          msgs.push({ type: 'red', title: 'SE HA EXCEDIDO EL 90% EN LAS CUENTAS', items: redAccounts.map(a => ({ name: a.name, pct: fmt(a.pct), gastos: a.gastos, partidas: a.partidas })) });
        }
        if (urgentAccounts.length && day >= 19) {
          msgs.push({ type: 'yellow', title: 'URGE INGRESAR EL GASTO EJERCIDO PARA ESTAS CUENTAS:', items: urgentAccounts.map(a => ({ name: a.name, pct: fmt(a.pct), gastos: a.gastos, partidas: a.partidas })) });
        }
        if (limitAccounts.length && day >= 19) {
          msgs.push({ type: 'red', title: 'ESTAS CUENTAS ESTÁN AL LÍMITE O EXCEDIDAS:', items: limitAccounts.map(a => ({ name: a.name, pct: fmt(a.pct), gastos: a.gastos, partidas: a.partidas })) });
        }

        if (mounted) {
          // Only update if content changed to avoid unnecessary rerenders
          const prev = prevBannersRef.current || [];
          const same = JSON.stringify(prev) === JSON.stringify(msgs);
          if (!same) {
            setBanners(msgs);
            setLastRefresh(new Date());
            try {
              if (msgs && msgs.length && toast && toast.add) {
                const t = msgs[0];
                const type = t.type === 'red' ? 'error' : 'info';
                toast.add(t.title || t.text || '', type, 10000);
              }
            } catch (e) { /* ignore toast errors */ }
            prevBannersRef.current = msgs;
          }
        }
      } catch (e) {
        try {
          if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') console.error('banner load error', e);
        } catch (ee) { /* swallow */ }
      }
    }

    // initial run + poll every 10 minutes
    loadBannerData();
    const intervalId = setInterval(loadBannerData, 10 * 60 * 1000);
    
    // Listen for filter changes and refresh banners
    const handleStorageChange = (e) => {
      if (e.key === 'dashboardFilters') {
        // Small delay to allow React state to settle
        setTimeout(loadBannerData, 100);
      }
    };
    
    // Also listen for custom events from same window
    const handleFilterChange = () => {
      setTimeout(loadBannerData, 100);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dashboardFiltersChanged', handleFilterChange);
    
    return () => { 
      mounted = false; 
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dashboardFiltersChanged', handleFilterChange);
    };
  }, []);

  // Additional useEffect for alert banners (current month only)
  useEffect(() => {
    let mounted = true;

    // Helper: robustly determine record month/year from multiple possible fields
    const inferMonthYear = (rec, dateFields = []) => {
      // prefer explicit numeric fields 'mes' or 'month'
      const rawMonth = rec.mes ?? rec.month ?? rec.mes_partida ?? rec.mes_gasto;
      const rawYear = rec.anno ?? rec.year ?? rec.anio;
      const parsedMonth = rawMonth === undefined || rawMonth === null ? null : Number(rawMonth);
      const parsedYear = rawYear === undefined || rawYear === null ? null : Number(rawYear);

      // Handle common formats:
      // - 1..12 => month
      // - 0..11 => zero-based month (convert to 1..12)
      if (Number.isFinite(parsedMonth)) {
        if (parsedMonth >= 1 && parsedMonth <= 12) return { month: parsedMonth, year: Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear() };
        if (parsedMonth >= 0 && parsedMonth <= 11) return { month: parsedMonth + 1, year: Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear() };
      }

      // fallback to provided date-like fields
      for (const f of dateFields) {
        const ds = rec[f];
        if (!ds) continue;
        try {
          const d = new Date(ds);
          if (!Number.isNaN(d.getTime())) return { month: d.getMonth() + 1, year: d.getFullYear() };
        } catch (e) { /* ignore */ }
      }

      // final fallback: try generic candidate fields that may contain a date
      const candidates = [rec.fecha_ini, rec.fecha_partida, rec.fecha_gasto, rec.fecha];
      for (const c of candidates) {
        if (!c) continue;
        try {
          const d = new Date(c);
          if (!Number.isNaN(d.getTime())) return { month: d.getMonth() + 1, year: d.getFullYear() };
        } catch (e) {}
      }

      return { month: null, year: null };
    };

    async function loadAlertBanners() {
      try {
        // Load only current month data for alerts
        const [gastosRes, partidasRes, cuentasRes] = await Promise.all([
          resourceService.list('gastos'),
          resourceService.list('partidas'),
          resourceService.list('cuentas')
        ]);

        const gastos = Array.isArray(gastosRes) ? gastosRes : (gastosRes?.data || []);
        const partidas = Array.isArray(partidasRes) ? partidasRes : (partidasRes?.data || []);
        const cuentas = Array.isArray(cuentasRes) ? cuentasRes : (cuentasRes?.data || []);

        const getCuentaId = (r) => r.idcuenta ?? r.id_cuenta ?? r.cuenta_id ?? r.idCuenta ?? r.cuenta ?? 'sin_cuenta';
        
        const current = new Date();
        const currentMonth = current.getMonth() + 1;
        const currentYear = current.getFullYear();

        // Filter data for ONLY current month and year
        const currentMonthPartidas = partidas.filter(p => {
          const { month, year } = inferMonthYear(p, ['fecha_ini', 'fecha_partida', 'fecha']);
          return (month === currentMonth) && (year === currentYear);
        });

        const currentMonthGastos = gastos.filter(g => {
          const { month, year } = inferMonthYear(g, ['fecha', 'fecha_gasto']);
          return (month === currentMonth) && (year === currentYear);
        });

        // Aggregate by cuenta for current month only
        const partidasByCuenta = {};
        for (const p of currentMonthPartidas) {
          const cuentaId = String(getCuentaId(p) ?? 'sin_cuenta');
          const val = Number(p.monto_base ?? p.monto ?? p.importe ?? 0) || 0;
          partidasByCuenta[cuentaId] = (partidasByCuenta[cuentaId] || 0) + val;
        }

        const gastosByCuenta = {};
        for (const g of currentMonthGastos) {
          const cuentaId = String(getCuentaId(g) ?? 'sin_cuenta');
          const val = Number(g.monto_base ?? g.monto ?? g.importe ?? g.amount ?? 0) || 0;
          gastosByCuenta[cuentaId] = (gastosByCuenta[cuentaId] || 0) + val;
        }

        // Build cuenta map
        const cuentaMap = {};
        for (const c of cuentas) {
          const id = String(c.idcuenta ?? c.id ?? c.value ?? c.idCuenta ?? 'sin_cuenta');
          cuentaMap[id] = c.nombre ?? c.descripcion ?? c.name ?? `Cuenta ${id}`;
        }

        // Apply business rules for current month only
        const today = new Date();
        const day = today.getDate();

        const alertMessages = [];
        const allIds = new Set([...Object.keys(partidasByCuenta), ...Object.keys(gastosByCuenta)]);
        
        for (const id of allIds) {
          const partidasTotal = Number(partidasByCuenta[id] || 0) || 0;
          const gastosTotal = Number(gastosByCuenta[id] || 0) || 0;
          const pct = partidasTotal > 0 ? (gastosTotal / partidasTotal) : (gastosTotal > 0 ? Infinity : 0);
          const label = cuentaMap[id] ?? id;
          const pctFormat = (pct === Infinity ? '∞%' : `${(pct * 100).toFixed(1)}%`);

          // Only apply rules for current period
          if (day >= 1 && day <= 10) {
            if (pct < 0.5) {
              alertMessages.push({
                type: 'error',
                title: `${label} - Gasto bajo`,
                message: `La cuenta ${label} solo ha ejercido el ${pctFormat} del presupuesto. Se requiere al menos 50% para este período.`,
                periodo: `Días 1-10`,
                cuenta: label,
                porcentaje: pctFormat,
                gastos: gastosTotal,
                partidas: partidasTotal
              });
            }
          } else if (day >= 11 && day <= 18) {
            if (pct < 0.7) {
              alertMessages.push({
                type: 'warning',
                title: `${label} - Gasto insuficiente`,
                message: `La cuenta ${label} ha ejercido el ${pctFormat} del presupuesto. Se requiere al menos 70% para este período.`,
                periodo: `Días 11-18`,
                cuenta: label,
                porcentaje: pctFormat,
                gastos: gastosTotal,
                partidas: partidasTotal
              });
            }
            if (pct > 0.9) {
              alertMessages.push({
                type: 'error',
                title: `${label} - Gasto excesivo`,
                message: `La cuenta ${label} ha ejercido el ${pctFormat} del presupuesto. Ha superado el límite del 90% para este período.`,
                periodo: `Días 11-18`,
                cuenta: label,
                porcentaje: pctFormat,
                gastos: gastosTotal,
                partidas: partidasTotal
              });
            }
          } else if (day >= 19) {
            if (pct < 0.8) {
              alertMessages.push({
                type: 'warning',
                title: `${label} - Urgente ejercer gasto`,
                message: `La cuenta ${label} solo ha ejercido el ${pctFormat} del presupuesto. Se requiere al menos 80% para este período final.`,
                periodo: `Días 19-31`,
                cuenta: label,
                porcentaje: pctFormat,
                gastos: gastosTotal,
                partidas: partidasTotal
              });
            }
            if (pct > 0.95) {
              alertMessages.push({
                type: 'error',
                title: `${label} - Límite excedido`,
                message: `La cuenta ${label} ha ejercido el ${pctFormat} del presupuesto. Ha superado el límite del 95% para este período.`,
                periodo: `Días 19-31`,
                cuenta: label,
                porcentaje: pctFormat,
                gastos: gastosTotal,
                partidas: partidasTotal
              });
            }
          }
        }

        if (mounted) {
          setAlertBanners(alertMessages);
        }

      } catch (error) {
        console.error('Error loading alert banners:', error);
      }
    }

    // Initial load and set up polling every 5 minutes for alerts
    loadAlertBanners();
    const alertIntervalId = setInterval(loadAlertBanners, 5 * 60 * 1000);
    
    return () => { 
      mounted = false; 
      clearInterval(alertIntervalId);
    };
  }, []);

  return (
    <div className="layout-root">
      <aside className="layout-sidebar">
        <div className="layout-brand">
          <h3>Inicio</h3>
          <div className="layout-user">{user?.nombre || user?.name || 'Usuario'}</div>
        </div>

        {/* Compact banner summary moved below the nav (see later in file) */}

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
                {Icon ? (
                  <span className={`menu-icon ${i.key}`}>
                    <Icon />
                  </span>
                ) : null}
                {i.label}
              </NavLink>
            );
          })}
        </nav>
        {/* Place compact banner summary here between Plantas and the logout button */}
        {!sidebarHidden && banners && banners.length > 0 && (
          <div className="sidebar-banner-summary">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px' }}>
              <strong style={{ fontSize: 13 }}>Analítica de negocio</strong>
              <button onClick={() => { setSidebarHidden(true); try { localStorage.setItem('sidebarBannersHidden', '1'); } catch (e) {} }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '0 10px 10px 10px' }}>
              {banners.map((b, i) => (
                <div key={i} className={b.type === 'red' ? 'sidebar-banner-item red' : 'sidebar-banner-item yellow'}>
                  {/* Show title and then list each variable as a bullet */}
                  <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>{b.title ?? b.text}</div>
                  {b.items && Array.isArray(b.items) ? (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {b.items.map((it, j) => (
                        <li key={j} style={{ marginBottom: 6 }}>
                          {/* show name, gastos and partidas (if available) and percentage */}
                          <div style={{ fontSize: 13 }}>
                            <strong>{it.name}</strong>
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>
                            {typeof it.gastos !== 'undefined' ? `$${Number(it.gastos).toLocaleString()} ` : ''}
                            {typeof it.partidas !== 'undefined' ? `/ $${Number(it.partidas).toLocaleString()} ` : ''}
                            {it.pct ? ` (${it.pct})` : ''}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div>{b.text}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <button className="layout-logout" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </aside>

      <main className="layout-content">
        <div className="layout-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2>Bienvenid@ al sistema para la Gestión del Presupuesto Altex</h2>
            <p>Selecciona un catálogo del lado izquierdo o analiza la información a través de los diferentes filtros.</p>
          </div>

          {/* Alertas del mes */}
          <div style={{ flex: 1, margin: '0 12px', maxWidth: 600 }}>
            {alertBanners && alertBanners.length > 0 && (
              <div>
                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: 16, 
                  color: '#374151', 
                  textAlign: 'center',
                  fontWeight: 600 
                }}>
                  Alertas del mes
                </h3>
                <div style={{ 
                  maxHeight: 80, 
                  overflowY: 'auto', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 6,
                  paddingRight: 4,
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#CBD5E0 #F7FAFC'
                }} className="alert-scroll">
                  {alertBanners.map((alert, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 4,
                        fontSize: 11,
                        backgroundColor: alert.type === 'error' ? '#FEF2F2' : '#FFFBEB',
                        border: `1px solid ${alert.type === 'error' ? '#FCA5A5' : '#FDE68A'}`,
                        color: alert.type === 'error' ? '#B91C1C' : '#92400E',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        minHeight: 60,
                        flexShrink: 0
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 3 }}>
                        {alert.title}
                      </div>
                      <div style={{ fontSize: 10, lineHeight: 1.2, marginBottom: 2 }}>
                        {alert.message}
                      </div>
                      <div style={{ 
                        fontSize: 9, 
                        color: alert.type === 'error' ? '#7F1D1D' : '#78350F',
                        fontStyle: 'italic'
                      }}>
                        Período: {alert.periodo}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(!alertBanners || alertBanners.length === 0) && (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: '#10B981',
                fontSize: 14,
                fontWeight: 500
              }}>
                ✓ Sin alertas para el mes actual
              </div>
            )}
          </div>

          <div style={{ marginLeft: 12, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img
              src={gpaxImg}
              alt="GPAX"
              className="header-logo"
              style={{ maxHeight: 72, width: 'auto', display: 'block', borderRadius: 6 }}
              onError={(e) => { e.target.onerror = null; e.target.src = '/pax.jpg'; }}
            />
            {lastRefresh ? (
              <div style={{ marginTop: 6, fontSize: 12, color: '#374151' }}>{`Última actualización: ${lastRefresh.toLocaleString()}`}</div>
            ) : null}
          </div>
        </div>

        <div className="layout-main">
          {/* nested routes will render here */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
