import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import resourceService from '../services/resourceService';

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

function normalize(record, tipo) {
  // monto: prefer monto_base, then fallbacks
  const monto = Number(record.monto_base ?? record.monto ?? record.importe ?? record.amount ?? record.costo ?? 0) || 0;

  // fecha selection depends on resource type:
  // - partidas: use `fecha_ini` (start date of the partida)
  // - gastos: use `fecha` (date of the gasto)
  // fall back to other common fields when the preferred one is missing
  let fecha = null;
  if (tipo === 'partida') {
    fecha = record.fecha_ini ?? record.fecha_partida ?? record.date ?? null;
  } else if (tipo === 'gasto') {
    fecha = record.fecha ?? record.fecha_gasto ?? record.date ?? null;
  } else {
    fecha = record.fecha ?? record.fecha_gasto ?? record.fecha_partida ?? record.date ?? null;
  }

  const mes = Number(record.mes ?? record.month ?? (fecha ? (new Date(fecha).getMonth() + 1) : undefined) ?? 1) || 1;
  const year = Number(record.anno ?? record.year ?? (fecha ? new Date(fecha).getFullYear() : undefined) ?? new Date().getFullYear()) || new Date().getFullYear();
  const categoria = record.categoria ?? record.tipo ?? record.category ?? 'otros';

  // expose explicit date fields for downstream presentation
  const fecha_partida = tipo === 'partida' ? fecha : null;
  const fecha_gasto = tipo === 'gasto' ? fecha : null;

  // preserve account id when present so we can filter by cuenta in charts
  const idcuenta = record.idcuenta ?? record.id_cuenta ?? record.cuenta_id ?? record.idCuenta ?? null;

  // preserve plant id when present so we can filter by planta in charts
  const idplanta = record.idplanta ?? record.id_planta ?? record.planta_id ?? record.idPlanta ?? null;

  return { tipo, monto, mes, year, categoria, fecha_partida, fecha_gasto, idcuenta, idplanta };
}

export default function DashboardHome() {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  // doughnut refs (partidas = left, gastos = right)
  const partidasRef = useRef(null);
  const partidasChartRef = useRef(null);
  const gastosRef = useRef(null);
  const gastosChartRef = useRef(null);

  const [records, setRecords] = useState([]);
  const [rawGastos, setRawGastos] = useState([]);
  const [rawPartidas, setRawPartidas] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [plantas, setPlantas] = useState([]);
  // refs to hold canvas and chart instances for per-account gauges
  const gaugeCanvasRefs = useRef({});
  const gaugeChartRefs = useRef({});
  const [selectedCuentas, setSelectedCuentas] = useState(['todas']);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState(['todas']);
  const [monthsOpen, setMonthsOpen] = useState(false);
  const monthsPanelRef = useRef(null);
  const [cuentasOpen, setCuentasOpen] = useState(false);
  const cuentasPanelRef = useRef(null);
  const [selectedPlantas, setSelectedPlantas] = useState(['todas']);
  const [plantasOpen, setPlantasOpen] = useState(false);
  const plantasPanelRef = useRef(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, [year]);

  // Sync current filters to localStorage so banner logic can access them
  useEffect(() => {
    try {
      const filters = {
        selectedMonths,
        selectedCuentas,
        selectedPlantas,
        year
      };
      localStorage.setItem('dashboardFilters', JSON.stringify(filters));
      // Dispatch custom event to notify banner logic
      window.dispatchEvent(new CustomEvent('dashboardFiltersChanged'));
    } catch (e) {
      // ignore localStorage errors
    }
  }, [selectedMonths, selectedCuentas, selectedPlantas, year]);

  async function loadData() {
    setLoading(true);
    try {
      const [gastosRes, partidasRes] = await Promise.all([
        resourceService.list('gastos'),
        resourceService.list('partidas')
      ]);

      const gastos = Array.isArray(gastosRes) ? gastosRes : (gastosRes?.data || []);
      const partidas = Array.isArray(partidasRes) ? partidasRes : (partidasRes?.data || []);

      const gastosNormalized = gastos.map(g => normalize(g, 'gasto'));
      const partidasNormalized = partidas.map(p => normalize(p, 'partida'));
      const combined = [...gastosNormalized, ...partidasNormalized];

      setRecords(combined);
      setRawGastos(gastos);
      setRawPartidas(partidas);

      // fetch cuentas and plantas for label mapping (best-effort; ignore errors)
      try {
        const [cuentasRes, plantasRes] = await Promise.all([
          resourceService.list('cuentas'),
          resourceService.list('plantas')
        ]);
        const cuentasArr = Array.isArray(cuentasRes) ? cuentasRes : (cuentasRes?.data || []);
        const plantasArr = Array.isArray(plantasRes) ? plantasRes : (plantasRes?.data || []);
        setCuentas(cuentasArr);
        setPlantas(plantasArr);
      } catch (e) {
        setCuentas([]);
        setPlantas([]);
      }

      // Quick validation: compare sums coming from raw monto_base vs normalized monto
      try {
        const sumRawGastosMontoBase = (gastos || []).reduce((s, r) => s + (Number(r.monto_base ?? 0) || 0), 0);
        const sumRawPartidasMontoBase = (partidas || []).reduce((s, r) => s + (Number(r.monto_base ?? 0) || 0), 0);
        const sumNormGastos = (gastosNormalized || []).reduce((s, r) => s + (Number(r.monto || 0) || 0), 0);
        const sumNormPartidas = (partidasNormalized || []).reduce((s, r) => s + (Number(r.monto || 0) || 0), 0);
        const missingGastos = (gastos || []).filter(r => r.monto_base === undefined || r.monto_base === null).length;
        const missingPartidas = (partidas || []).filter(r => r.monto_base === undefined || r.monto_base === null).length;
        console.info('Dashboard monto_base validation:', { sumRawGastosMontoBase, sumRawPartidasMontoBase, sumNormGastos, sumNormPartidas, missingGastos, missingPartidas });
      } catch (e) {
        console.warn('Error computing monto_base validation', e);
      }

      // draw charts (small timeout to ensure refs are mounted)
      setTimeout(() => buildChart(combined), 50);
    } catch (err) {
      console.error('Dashboard load error', err);
    } finally {
      setLoading(false);
    }
  }

  function processByMonth(allRecords) {
    const byMonth = Array.from({ length: 12 }, () => ({ gastos: 0, partidas: 0 }));

    for (const r of allRecords) {
      // filter by selected plantas if any
      if (selectedPlantas && !(selectedPlantas.includes('todas') || selectedPlantas.length === 0)) {
        const recPlanta = String(r.idplanta ?? 'sin_planta');
        if (!selectedPlantas.map(String).includes(recPlanta)) continue;
      }
        // filter by selected cuentas if any
        if (selectedCuentas && !(selectedCuentas.includes('todas') || selectedCuentas.length === 0)) {
          const recCuenta = r.idcuenta ?? r.id_cuenta ?? r.cuenta_id ?? r.idCuenta ?? null;
          if (!selectedCuentas.map(String).includes(String(recCuenta))) continue;
        }
      // Prefer explicit date fields (fecha_partida for partidas, fecha_gasto for gastos)
      const dateStr = r.fecha_partida ?? r.fecha_gasto ?? r.fecha ?? null;
      let recMonth = r.mes;
      let recYear = r.year;

      if (dateStr) {
        const d = new Date(dateStr);
        if (!Number.isNaN(d.getTime())) {
          recMonth = d.getMonth() + 1;
          recYear = d.getFullYear();
        }
      }

      recYear = Number(recYear) || new Date().getFullYear();
      if (recYear !== Number(year)) continue;

      // If specific months are selected (not 'todas'), only include records for those months
      if (selectedMonths && !(selectedMonths.includes('todas') || selectedMonths.length === 0)) {
        const monthsNums = selectedMonths.map(m => Number(m));
        if (!monthsNums.includes(Number(recMonth))) continue;
      }

      const idx = Math.max(0, Math.min(11, Number(recMonth || 1) - 1));
      if (r.tipo === 'gasto') byMonth[idx].gastos += Number(r.monto || 0);
      else if (r.tipo === 'partida') byMonth[idx].partidas += Number(r.monto || 0);
    }
    return byMonth;
  }

  function buildChart(allRecords) {
    const data = processByMonth(allRecords);
    const gastosData = data.map(d => d.gastos);
    const partidasData = data.map(d => d.partidas);

    // destroy existing chart if present
    if (chartRef.current) {
      try { chartRef.current.destroy(); } catch (e) { /* ignore */ }
      chartRef.current = null;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.('2d');
    if (!ctx || !canvas) return;

    // Create vertical gradients for a modern look
    const gradGastos = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradGastos.addColorStop(0, 'rgba(59,130,246,0.95)');
    gradGastos.addColorStop(1, 'rgba(59,130,246,0.35)');

  const gradPartidas = ctx.createLinearGradient(0, 0, 0, canvas.height);
  // use orange gradient for partidas instead of green
  gradPartidas.addColorStop(0, 'rgba(249,115,22,0.9)');
  gradPartidas.addColorStop(1, 'rgba(249,115,22,0.18)');

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: MESES,
        datasets: [
          {
            type: 'bar',
            label: 'Gastos Ejercidos',
            data: gastosData,
            backgroundColor: gradGastos,
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 44,
            barPercentage: 0.62,
            categoryPercentage: 0.8
          },
          {
            type: 'line',
            label: 'Partidas Presupuesto',
            data: partidasData,
            borderColor: 'rgba(249,115,22,1)',
            backgroundColor: gradPartidas,
            tension: 0.32,
            pointRadius: 4,
            pointBackgroundColor: '#f97316',
            borderWidth: 3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, padding: 8 } },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 10,
            callbacks: {
              label: function(context) {
                const value = Number(context.raw) || 0;
                return `${context.dataset.label}: $${value.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { padding: 6 }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(2,6,23,0.06)', drawBorder: false },
            ticks: {
              padding: 6,
              callback: function(val) { return '$' + Number(val).toLocaleString(); }
            }
          }
        },
        animation: { duration: 800, easing: 'easeOutQuart' }
      }
    });
  }

  // generic doughnut builder: aggregate monto_base by idcuenta from any source array
  function buildDoughnut(sourceArray, cuentasArray, canvasRefLocal, chartRefLocal) {
    const totals = {};
    for (const r of sourceArray || []) {
      if (selectedPlantas && !(selectedPlantas.includes('todas') || selectedPlantas.length === 0)) {
        const recPlanta = String(r.idplanta ?? 'sin_planta');
        if (!selectedPlantas.map(String).includes(recPlanta)) continue;
      }
      // Determine record year: prefer normalized `year` if present, otherwise derive from date-like fields
      let recYear = r.year ?? r.anno;
      if (recYear === undefined || recYear === null) {
        const dateStr = r.fecha ?? r.fecha_gasto ?? r.fecha_partida ?? r.fecha_ini ?? null;
        if (dateStr) {
          const d = new Date(dateStr);
          if (!Number.isNaN(d.getTime())) recYear = d.getFullYear();
        }
      }
      if (Number(recYear) !== Number(year)) continue;

      // determine record month for month filter
      let recMonth = r.mes ?? r.month;
      if (recMonth === undefined || recMonth === null) {
        const dateStr = r.fecha ?? r.fecha_gasto ?? r.fecha_partida ?? r.fecha_ini ?? null;
        if (dateStr) {
          const d = new Date(dateStr);
          if (!Number.isNaN(d.getTime())) recMonth = d.getMonth() + 1;
        }
      }
      if (selectedMonths && !(selectedMonths.includes('todas') || selectedMonths.length === 0)) {
        const monthsNums = selectedMonths.map(m => Number(m));
        if (!monthsNums.includes(Number(recMonth))) continue;
      }

      // determine account id from normalized or raw fields
      const id = r.idcuenta ?? r.id_cuenta ?? r.cuenta_id ?? r.idCuenta ?? 'sin_cuenta';
      // apply cuentas filter if set
      if (selectedCuentas && !(selectedCuentas.includes('todas') || selectedCuentas.length === 0)) {
        if (!selectedCuentas.map(String).includes(String(id))) continue;
      }

      // prefer normalized monto when available (normalize() sets `monto`), else use raw monto_base
      const val = Number(r.monto ?? r.monto_base ?? 0) || 0;
      totals[id] = (totals[id] || 0) + val;
    }

    const cuentaMap = {};
    for (const c of cuentasArray || []) {
      const id = c.idcuenta ?? c.id ?? null;
      const label = c.nombre ?? c.descripcion ?? c.name ?? `Cuenta ${id}`;
      if (id !== null) cuentaMap[id] = label;
    }

    const labels = [];
    const data = [];
    for (const [id, total] of Object.entries(totals)) {
      labels.push(cuentaMap[id] ?? String(id));
      data.push(total);
    }

    if (chartRefLocal.current) {
      try { chartRefLocal.current.destroy(); } catch (e) {}
      chartRefLocal.current = null;
    }
    if (!labels.length) return;

    const canvas = canvasRefLocal.current;
    const ctx = canvas?.getContext?.('2d');
    if (!ctx) return;

  // prefer orange for the partidas slice (replace green)
  const palette = ['#3b82f6','#f97316','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#14b8a6','#a78bfa','#f43f5e'];
    const backgroundColors = labels.map((_, i) => palette[i % palette.length]);

    chartRefLocal.current = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: backgroundColors, borderColor: 'rgba(0,0,0,0.05)', borderWidth: 1 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, padding: 8 } },
          tooltip: { callbacks: { label: function(context) { const v = Number(context.raw)||0; const pct = data.reduce((a,b)=>a+b,0)||0; const percent = pct?((v/pct)*100).toFixed(1):'0.0'; return `${context.label}: $${v.toLocaleString()} (${percent}%)`; } } }
        },
        cutout: '40%'
      }
    });
  }

  const totals = React.useMemo(() => {
    const byMonth = processByMonth(records);
    const totalG = byMonth.reduce((s, m) => s + m.gastos, 0);
    const totalP = byMonth.reduce((s, m) => s + m.partidas, 0);
    return { totalGastos: totalG, totalPartidas: totalP, diferencia: totalP - totalG };
  }, [records, year, selectedPlantas, selectedCuentas, selectedMonths]);

  // unified typography for summary labels and amounts
  const labelStyle = { fontSize: 12, color: '#666', lineHeight: '1.2' };
  const amountStyle = { fontSize: 18, fontWeight: 700, lineHeight: '1.15' };
  // shared filter styles (uniform size, font and spacing) - made more compact
  const filterLabelStyle = { display: 'block', marginBottom: 6, fontSize: 12, color: '#374151', fontWeight: 600 };
  const filterInputStyle = { width: '100%', padding: '6px 8px', height: 34, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 13, color: '#0f172a', boxSizing: 'border-box' };
  // shared card style so all summary cards are identical - reduced height/padding
  const cardStyle = { padding: 12, borderRadius: 10, background: '#fff', minHeight: 72, display: 'flex', alignItems: 'center' };
  const innerGrid = { display: 'grid', gridTemplateRows: 'auto auto', alignItems: 'baseline', width: '100%' };

  const years = React.useMemo(() => {
    const setYears = new Set();
    for (const r of records) {
      const dateStr = r.fecha_partida ?? r.fecha_gasto ?? r.fecha ?? null;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!Number.isNaN(d.getTime())) setYears.add(d.getFullYear());
      } else {
        setYears.add(Number(r.year) || new Date().getFullYear());
      }
    }
    setYears.add(new Date().getFullYear());
    return [...setYears].sort((a,b) => b-a);
  }, [records]);

  const plantaOptions = React.useMemo(() => {
    // Create map of planta IDs to names from plantas table
    const plantaMap = {};
    for (const p of plantas) {
      const id = p.idplanta ?? p.id;
      if (id != null) {
        plantaMap[String(id)] = p.nombre ?? p.name ?? `Planta ${id}`;
      }
    }
    
    // Get unique plant IDs from records
    const usedIds = new Set();
    for (const r of records) {
      const id = r.idplanta;
      if (id != null) usedIds.add(String(id));
    }
    
    // Return options with proper names
    return [...usedIds]
      .map(id => ({ 
        id: id, 
        name: plantaMap[id] ?? `Planta ${id}` 
      }))
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [records, plantas]);

  const selectedCuentaLabel = React.useMemo(() => {
    if (!selectedCuentas || selectedCuentas.includes('todas') || selectedCuentas.length === 0) return 'Todas las cuentas';
    const selected = selectedCuentas.map(String);
    const labels = (cuentas || []).filter(x => selected.includes(String(x.idcuenta ?? x.id ?? x.idCuenta ?? x.value ?? ''))).map(c => c.nombre ?? c.descripcion ?? c.name ?? `Cuenta ${c.id}`);
    return labels.length ? labels.join(', ') : `${selectedCuentas.length} cuentas seleccionadas`;
  }, [selectedCuentas, cuentas]);

  const selectedPlantaLabel = React.useMemo(() => {
    if (!selectedPlantas || selectedPlantas.includes('todas') || selectedPlantas.length === 0) return 'Todas las plantas';
    const selected = selectedPlantas.map(String);
    const labels = plantaOptions.filter(p => selected.includes(String(p.id))).map(p => p.name);
    return labels.length ? labels.join(', ') : `${selectedPlantas.length} plantas seleccionadas`;
  }, [selectedPlantas, plantaOptions]);

  // Rebuild chart when records, year or selectedPlantas change
  useEffect(() => {
    buildChart(records);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, year, selectedPlantas, selectedCuentas, selectedMonths]);

  // Rebuild both doughnuts when raw data, cuentas or filters change
  useEffect(() => {
    // Use normalized records (from `records`) filtered by tipo so monto normalization is respected
    buildDoughnut(records.filter(r => r.tipo === 'partida'), cuentas, partidasRef, partidasChartRef);
    buildDoughnut(records.filter(r => r.tipo === 'gasto'), cuentas, gastosRef, gastosChartRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, cuentas, year, selectedPlantas, selectedCuentas, selectedMonths]);

  // compute per-account totals for gauges
  const perCuentaTotals = React.useMemo(() => {
    // map of id -> { id, label, gastos, partidas }
    const map = {};
    // prepare cuenta labels from cuentas list
    const cuentaLabels = {};
    for (const c of cuentas || []) {
      const id = c.idcuenta ?? c.id ?? null;
      if (id !== null) cuentaLabels[String(id)] = c.nombre ?? c.descripcion ?? c.name ?? `Cuenta ${id}`;
    }

    for (const r of records || []) {
      // filter by year/month/category similar to buildDoughnut
      let recYear = r.year ?? r.anno;
      if (recYear === undefined || recYear === null) {
        const dateStr = r.fecha ?? r.fecha_gasto ?? r.fecha_partida ?? r.fecha_ini ?? null;
        if (dateStr) {
          const d = new Date(dateStr);
          if (!Number.isNaN(d.getTime())) recYear = d.getFullYear();
        }
      }
      if (Number(recYear) !== Number(year)) continue;

      if (selectedPlantas && !(selectedPlantas.includes('todas') || selectedPlantas.length === 0)) {
        const recPlanta = String(r.idplanta ?? 'sin_planta');
        if (!selectedPlantas.map(String).includes(recPlanta)) continue;
      }

      let recMonth = r.mes ?? r.month;
      if (recMonth === undefined || recMonth === null) {
        const dateStr = r.fecha ?? r.fecha_gasto ?? r.fecha_partida ?? r.fecha_ini ?? null;
        if (dateStr) {
          const d = new Date(dateStr);
          if (!Number.isNaN(d.getTime())) recMonth = d.getMonth() + 1;
        }
      }
      if (selectedMonths && !(selectedMonths.includes('todas') || selectedMonths.length === 0)) {
        const monthsNums = selectedMonths.map(m => Number(m));
        if (!monthsNums.includes(Number(recMonth))) continue;
      }

      const id = String(r.idcuenta ?? r.id_cuenta ?? r.cuenta_id ?? r.idCuenta ?? 'sin_cuenta');
      if (selectedCuentas && !(selectedCuentas.includes('todas') || selectedCuentas.length === 0)) {
        if (!selectedCuentas.map(String).includes(id)) continue;
      }

      if (!map[id]) map[id] = { id, label: cuentaLabels[id] ?? (id === 'sin_cuenta' ? 'Sin cuenta' : `Cuenta ${id}`), gastos: 0, partidas: 0 };
      const val = Number(r.monto ?? r.monto_base ?? 0) || 0;
      if (r.tipo === 'gasto') map[id].gastos += val;
      else if (r.tipo === 'partida') map[id].partidas += val;
    }
    return Object.values(map).sort((a,b) => (b.gastos - b.partidas) - (a.gastos - a.partidas));
  }, [records, cuentas, year, selectedMonths, selectedPlantas, selectedCuentas]);

  // Build gauge charts for each account when perCuentaTotals changes
  useEffect(() => {
    // destroy existing charts not in current list
    const existingIds = Object.keys(gaugeChartRefs.current || {});
    const newIds = perCuentaTotals.map(c => String(c.id));
    for (const id of existingIds) {
      if (!newIds.includes(id)) {
        try { gaugeChartRefs.current[id]?.destroy(); } catch (e) {}
        delete gaugeChartRefs.current[id];
      }
    }

    // helper plugin to draw needle
    const needlePlugin = {
      id: 'gauge_needle',
      afterDraw(chart) {
        const { ctx, data } = chart;
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data || !meta.data[0]) return;
        const centerX = meta.data[0].x;
        const centerY = meta.data[0].y;
        const outerRadius = meta.data[0].outerRadius;
        const total = data.datasets[0].data.reduce((a,b) => a + b, 0) || 1;
        const value = data.datasets[0].data[0] || 0;
        const ratio = Math.max(0, Math.min(1, value / total));
        // semicircle: rotation = -PI, circumference = PI
        const angle = -Math.PI + (Math.PI * ratio);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);

        // needle
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(outerRadius - 12, 0);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#111827';
        ctx.stroke();

        // center circle
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#111827';
        ctx.fill();

        ctx.restore();
      }
    };

      for (const acct of perCuentaTotals) {
      const id = String(acct.id);
      // ensure canvas ref exists
      if (!gaugeCanvasRefs.current[id]) continue;
      const canvas = gaugeCanvasRefs.current[id];
      const ctx = canvas?.getContext?.('2d');
      if (!ctx) continue;

      // destroy old chart if exists
      if (gaugeChartRefs.current[id]) {
        try { gaugeChartRefs.current[id].destroy(); } catch (e) {}
        gaugeChartRefs.current[id] = null;
      }

      // Determine values
      const gasto = Number(acct.gastos || 0);
      const partida = Number(acct.partidas || 0);
      // if gasto is zero, set a minimal base so segments render and we avoid division by zero
      const base = gasto > 0 ? gasto : Math.max(partida, 1);

      // build colored range segments: red 0-50%, orange 50-70%, yellow 70-90%, green 90-100%
      const ranges = [
        { pct: 0.5, color: '#ef4444' },
        { pct: 0.2, color: '#f97316' },
        { pct: 0.2, color: '#fbbf24' },
        { pct: 0.1, color: '#10b981' }
      ];
      // compute segment absolute values (sum should be base)
      const segs = ranges.map(r => Math.max(0, r.pct * base));
      // human-friendly labels for each range (e.g. '0–50%')
      let cum = 0;
      const rangeLabels = ranges.map(r => {
        const low = Math.round(cum * 100);
        cum += r.pct;
        const high = Math.round(cum * 100);
        return `${low}%–${high}%`;
      });

      // plugin to draw numeric markers at range boundaries
      const markerPlugin = {
        id: 'gauge_markers',
        afterDraw(chart) {
          const { ctx } = chart;
          const meta = chart.getDatasetMeta(0);
          if (!meta || !meta.data || !meta.data[0]) return;
          const centerX = meta.data[0].x;
          const centerY = meta.data[0].y;
          const outerRadius = meta.data[0].outerRadius;

          ctx.save();
          ctx.fillStyle = '#0f172a';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // draw ticks and labels at cumulative boundaries
          let cumulative = 0;
          for (let i = 0; i < ranges.length; i++) {
            cumulative += ranges[i].pct;
            const frac = Math.min(1, cumulative);
            const angle = -Math.PI + (Math.PI * frac);
            const tx = centerX + Math.cos(angle) * (outerRadius + 18);
            const ty = centerY + Math.sin(angle) * (outerRadius + 18);
            // small tick
            const tickInner = centerX + Math.cos(angle) * (outerRadius - 6);
            const tickOuter = centerX + Math.cos(angle) * (outerRadius + 6);
            const tickInnerY = centerY + Math.sin(angle) * (outerRadius - 6);
            const tickOuterY = centerY + Math.sin(angle) * (outerRadius + 6);
            ctx.beginPath();
            ctx.moveTo(tickInner, tickInnerY);
            ctx.lineTo(tickOuter, tickOuterY);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#111827';
            ctx.stroke();

            // label value at this boundary
            const valueAt = (base * frac) || 0;
            const valText = `$${Number(valueAt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            ctx.fillText(valText, tx, ty);
          }

          ctx.restore();
        }
      };

      // ensure canvas has a sensible drawing size (wider than tall to form a semicircle)
      try {
        const parent = canvas.parentElement || canvas.parentNode;
        const rect = parent ? parent.getBoundingClientRect() : null;
        const desiredWidth = rect && rect.width ? Math.max(220, Math.round(rect.width)) : 260;
        const desiredHeight = Math.max(110, Math.round(desiredWidth / 2));
        canvas.width = desiredWidth;
        canvas.height = desiredHeight;
        canvas.style.width = '100%';
        canvas.style.height = desiredHeight + 'px';
        // clear drawing surface
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } catch (e) {
        // ignore sizing errors
      }

      // Build a compact grouped horizontal bar chart with both bars on the same row (single category)
      const datasets = [
        {
          label: 'Gastos Ejercidos',
          data: [gasto],
          backgroundColor: '#2563eb',
          borderRadius: 6,
          barThickness: 12
        },
          {
            label: 'Partidas Presupuesto',
            data: [partida],
            // partidas bar uses orange to match the main line chart
            backgroundColor: 'rgba(249,115,22,0.55)',
            borderRadius: 6,
            barThickness: 12
        }
      ];

      const maxX = Math.max(gasto, partida, 1) * 1.12;

      gaugeChartRefs.current[id] = new Chart(ctx, {
        type: 'bar',
        data: { labels: [''], datasets },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { beginAtZero: true, max: maxX, ticks: { callback: (v) => `$${Number(v).toLocaleString()}` } },
            y: { grid: { display: false }, ticks: { display: false } }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              callbacks: {
                title: () => acct.label,
                label: (context) => {
                  const label = context.dataset.label || '';
                  const val = Number(context.raw) || 0;
                  if (label === 'Partidas Presupuesto') {
                    const pct = gasto > 0 ? ((partida / gasto) * 100).toFixed(1) : 'N/A';
                    return `${label}: $${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${pct}%)`;
                  }
                  return `${label}: $${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
              }
            }
          }
        }
      });
    }

    return () => {
      // cleanup on unmount
      for (const id of Object.keys(gaugeChartRefs.current || {})) {
        try { gaugeChartRefs.current[id]?.destroy(); } catch (e) {}
        delete gaugeChartRefs.current[id];
      }
    };
  }, [perCuentaTotals]);

  // close months panel on outside click
  useEffect(() => {
    function handleDoc(ev) {
      if (!monthsPanelRef.current) return;
      if (!monthsPanelRef.current.contains(ev.target)) setMonthsOpen(false);
    }
    if (monthsOpen) document.addEventListener('mousedown', handleDoc);
    return () => document.removeEventListener('mousedown', handleDoc);
  }, [monthsOpen]);

  // close cuentas panel on outside click
  useEffect(() => {
    function handleDoc(ev) {
      if (!cuentasPanelRef.current) return;
      if (!cuentasPanelRef.current.contains(ev.target)) setCuentasOpen(false);
    }
    if (cuentasOpen) document.addEventListener('mousedown', handleDoc);
    return () => document.removeEventListener('mousedown', handleDoc);
  }, [cuentasOpen]);

  // close plantas panel on outside click
  useEffect(() => {
    function handleDoc(ev) {
      if (!plantasPanelRef.current) return;
      if (!plantasPanelRef.current.contains(ev.target)) setPlantasOpen(false);
    }
    if (plantasOpen) document.addEventListener('mousedown', handleDoc);
    return () => document.removeEventListener('mousedown', handleDoc);
  }, [plantasOpen]);

  // toggle helpers for multi-select controls
  function toggleMonth(m) {
    setSelectedMonths(prev => {
      // normalize values as strings; 'todas' is special
      const isTodas = m === 'todas';
      if (isTodas) return ['todas'];
      const prevSet = new Set(prev || []);
      if (prevSet.has('todas')) {
        // switch from all to single selection
        return [m];
      }
      if (prevSet.has(m)) {
        prevSet.delete(m);
      } else {
        prevSet.add(m);
      }
      const next = Array.from(prevSet);
      return next.length ? next : ['todas'];
    });
  }

  function toggleCuenta(id) {
    const sid = String(id);
    setSelectedCuentas(prev => {
      if (!prev) prev = ['todas'];
      const prevSet = new Set(prev.map(String));
      if (prevSet.has('todas')) {
        // selecting an individual cuenta should replace 'todas'
        if (sid === 'todas') return ['todas'];
        return [sid];
      }
      if (sid === 'todas') return ['todas'];
      if (prevSet.has(sid)) prevSet.delete(sid);
      else prevSet.add(sid);
      const next = Array.from(prevSet);
      return next.length ? next : ['todas'];
    });
  }

  function togglePlanta(id) {
    const sid = String(id);
    setSelectedPlantas(prev => {
      if (!prev) prev = ['todas'];
      const prevSet = new Set(prev.map(String));
      if (prevSet.has('todas')) {
        if (sid === 'todas') return ['todas'];
        return [sid];
      }
      if (sid === 'todas') return ['todas'];
      if (prevSet.has(sid)) prevSet.delete(sid);
      else prevSet.add(sid);
      const next = Array.from(prevSet);
      return next.length ? next : ['todas'];
    });
  }

  return (
    <div className="inicio-panel" style={{ padding: 12, position: 'relative' }}>
      {/* decorative background image for the Inicio panel (transparent, non-interactive) */}
      <div className="inicio-bg" aria-hidden="true" style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: "url('/Fondo.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
  opacity: 0.2,
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{ marginBottom: 8 }}>
        {/* compact filters moved above charts */}
      </div>

  <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-end', position: 'relative', overflow: 'visible', zIndex: (monthsOpen || cuentasOpen || plantasOpen) ? 80 : 1 }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={filterLabelStyle}>Año</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={filterInputStyle}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 180, position: 'relative' }} ref={monthsPanelRef}>
          <label style={filterLabelStyle}>Mes</label>
          <div onClick={() => setMonthsOpen(open => !open)} style={{ ...filterInputStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedMonths && (selectedMonths.includes('todas') || selectedMonths.length === 0)
                ? 'Todos los meses'
                : selectedMonths.map(s => MESES[Number(s) - 1]).filter(Boolean).join(', ')}
            </div>
            <div style={{ marginLeft: 8, color: '#64748b' }}>{monthsOpen ? '▲' : '▼'}</div>
          </div>

          {monthsOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, zIndex: 60, maxHeight: 240, overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>Seleccionar meses</strong>
                <div>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedMonths(['todas']); }} style={{ marginRight: 8, background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer' }}>Todas</button>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedMonths([]); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>Limpiar</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
                  <input type="checkbox" checked={selectedMonths && selectedMonths.includes('todas')} onChange={(e) => { e.stopPropagation(); if (e.target.checked) setSelectedMonths(['todas']); else setSelectedMonths([]); }} />
                  <span style={{ fontSize: 13 }}>Todos los meses</span>
                </label>
                {MESES.map((m, i) => {
                  const key = String(i + 1);
                  return (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
                      <input type="checkbox" checked={selectedMonths && selectedMonths.includes(key)} onChange={(e) => { e.stopPropagation(); toggleMonth(key); }} />
                      <span style={{ fontSize: 13 }}>{m}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 180, position: 'relative' }} ref={cuentasPanelRef}>
          <label style={filterLabelStyle}>Cuenta</label>
          <div onClick={() => setCuentasOpen(open => !open)} style={{ ...filterInputStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedCuentaLabel}</div>
            <div style={{ marginLeft: 8, color: '#64748b' }}>{cuentasOpen ? '▲' : '▼'}</div>
          </div>

          {cuentasOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, zIndex: 60, maxHeight: 240, overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>Seleccionar cuentas</strong>
                <div>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedCuentas(['todas']); }} style={{ marginRight: 8, background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer' }}>Todas</button>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedCuentas([]); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>Limpiar</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={selectedCuentas && selectedCuentas.includes('todas')} onChange={(e) => { e.stopPropagation(); if (e.target.checked) setSelectedCuentas(['todas']); else setSelectedCuentas([]); }} />
                  <span style={{ fontSize: 13 }}>Todas las cuentas</span>
                </label>
                {(cuentas || []).map(c => {
                  const id = String(c.idcuenta ?? c.id ?? c.value ?? c.idCuenta ?? '');
                  const label = c.nombre ?? c.descripcion ?? c.name ?? `Cuenta ${id}`;
                  return (
                    <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={selectedCuentas && selectedCuentas.map(String).includes(id)} onChange={(e) => { e.stopPropagation(); toggleCuenta(id); }} />
                      <span style={{ fontSize: 13 }}>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 180, position: 'relative' }} ref={plantasPanelRef}>
          <label style={filterLabelStyle}>Planta</label>
          <div onClick={() => setPlantasOpen(open => !open)} style={{ ...filterInputStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedPlantaLabel}</div>
            <div style={{ marginLeft: 8, color: '#64748b' }}>{plantasOpen ? '▲' : '▼'}</div>
          </div>

          {plantasOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, zIndex: 60, maxHeight: 240, overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>Seleccionar plantas</strong>
                <div>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedPlantas(['todas']); }} style={{ marginRight: 8, background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer' }}>Todas</button>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedPlantas([]); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>Limpiar</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={selectedPlantas && selectedPlantas.includes('todas')} onChange={(e) => { e.stopPropagation(); if (e.target.checked) setSelectedPlantas(['todas']); else setSelectedPlantas([]); }} />
                  <span style={{ fontSize: 13 }}>Todas las plantas</span>
                </label>
                {plantaOptions.map(p => {
                  const id = String(p.id);
                  return (
                    <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={selectedPlantas && selectedPlantas.map(String).includes(id)} onChange={(e) => { e.stopPropagation(); togglePlanta(id); }} />
                      <span style={{ fontSize: 13 }}>{p.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={cardStyle}>
            <div style={innerGrid}>
            <div style={labelStyle}>Total Gastos Ejercidos</div>
            <div style={amountStyle}>${totals.totalGastos.toLocaleString()}</div>
          </div>
        </div>
        <div style={cardStyle}>
          <div style={innerGrid}>
            <div style={labelStyle}>Total de Partidas Presupuesto</div>
            <div style={amountStyle}>${totals.totalPartidas.toLocaleString()}</div>
          </div>
        </div>
        <div style={cardStyle}>
          <div style={innerGrid}>
            <div style={labelStyle}>Diferencia</div>
            {(() => {
              const diff = Number(totals.diferencia) || 0;
              const color = diff >= 0 ? '#16a34a' : '#dc2626';
              return <div style={{ ...amountStyle, color }}>{`$${diff.toLocaleString()}`}</div>;
            })()}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={innerGrid}>
            <div style={labelStyle}>Porcentaje</div>
            {(() => {
              const pct = totals.totalPartidas ? (totals.diferencia / totals.totalPartidas) * 100 : 0;
              const pctText = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
              const color = pct >= 0 ? '#16a34a' : '#dc2626';
              return (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    ...amountStyle,
                    color,
                    padding: '4px 8px',
                    borderRadius: 6,
                    minWidth: 56,
                    textAlign: 'center',
                    display: 'inline-block',
                    backgroundColor: 'transparent'
                  }}>{pctText}</div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Per-account gauges: one gauge per cuenta comparing Gastos (base) vs Partidas (needle) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 8 }}>
        {perCuentaTotals && perCuentaTotals.length ? perCuentaTotals.map((acct) => {
          // compute ratio = (Gastos Ejercidos) / (Partidas Presupuesto) * 100
          const gasto = Number(acct.gastos || 0);
          const partida = Number(acct.partidas || 0);
          const ratio = partida > 0 ? (gasto / partida) * 100 : (gasto > 0 ? Infinity : 0);
          const badgeText = ratio === Infinity ? '∞%' : `${ratio.toFixed(1)}%`;
          const badgeColor = ratio === Infinity ? '#ef4444' : (ratio <= 100 ? '#10b981' : '#ef4444');

          return (
            <div key={String(acct.id)} style={{ position: 'relative', background: '#fff', padding: 10, borderRadius: 10, minHeight: 120, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 14 }}>{acct.label}</strong>
              </div>
              {/* single badge showing GastosEjercidos / PartidasPresupuesto ratio */}
              {(gasto > 0 || partida > 0) && (
                <div style={{ position: 'absolute', right: 10, top: 8, background: badgeColor, color: '#fff', padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                  {badgeText}
                </div>
              )}
              <div style={{ flex: '0 0 72px', height: 72, position: 'relative' }}>
                <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: "url('/Fondo.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.2, pointerEvents: 'none', zIndex: 0 }} />
                <canvas ref={(el) => { gaugeCanvasRefs.current[String(acct.id)] = el; }} style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }} />
              </div>
              {/* difference: Partidas Presupuesto - Gastos Ejercidos (show inside the card under the chart) */}
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Diferencia</div>
                {(() => {
                  const diff = Number(acct.partidas || 0) - Number(acct.gastos || 0);
                  const diffText = `$${Number(diff).toLocaleString()}`;
                  const diffColor = diff >= 0 ? '#16a34a' : '#dc2626';
                  return <div style={{ fontSize: 14, fontWeight: 700, color: diffColor }}>{diffText}</div>;
                })()}
              </div>
            </div>
          );
        }) : (
          <div style={{ gridColumn: '1/-1', color: '#6b7280' }}>No hay cuentas o datos para mostrar gauges.</div>
        )}
      </div>


  <div style={{ background: '#fff', padding: 20, borderRadius: 10, height: 420, overflow: 'hidden', marginTop: 16 }}>
        <h3>Comparativo Mensual {year}</h3>
        <div style={{ position: 'relative', height: '340px' }}>
          <div aria-hidden="true" style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url('/Fondo.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.2,
            pointerEvents: 'none',
            filter: 'contrast(0.98)',
            zIndex: 0
          }} />
          <canvas ref={canvasRef} id="mainChart" style={{ position: 'relative', zIndex: 1 }}></canvas>
        </div>
      </div>

      {/* Two doughnuts side-by-side: partidas (left) and gastos (right) */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        <div style={{ flex: 1, background: '#fff', padding: 12, borderRadius: 10, minHeight: 240 }}>
          <h4 style={{ marginTop: 0 }}>Partidas Presupuesto por cuenta ({selectedCuentaLabel})</h4>
          <div style={{ height: 180, position: 'relative' }}>
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: "url('/Fondo.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.2, pointerEvents: 'none', zIndex: 0 }} />
            <canvas ref={partidasRef} id="partidasDoughnut" style={{ position: 'relative', zIndex: 1 }}></canvas>
          </div>
        </div>

        <div style={{ flex: 1, background: '#fff', padding: 12, borderRadius: 10, minHeight: 240 }}>
          <h4 style={{ marginTop: 0 }}>Gastos Ejercidos por cuenta ({selectedCuentaLabel})</h4>
          <div style={{ height: 180, position: 'relative' }}>
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: "url('/Fondo.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.2, pointerEvents: 'none', zIndex: 0 }} />
            <canvas ref={gastosRef} id="gastosDoughnut" style={{ position: 'relative', zIndex: 1 }}></canvas>
          </div>
        </div>
      </div>
    </div>
  );
}
