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

  return { tipo, monto, mes, year, categoria, fecha_partida, fecha_gasto };
}

export default function DashboardHome() {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [records, setRecords] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, [year]);

  async function loadData() {
    setLoading(true);
    try {
      const [gastosRes, partidasRes] = await Promise.all([
        resourceService.list('gastos'),
        resourceService.list('partidas')
      ]);

      const gastos = Array.isArray(gastosRes) ? gastosRes : (gastosRes?.data || []);
      const partidas = Array.isArray(partidasRes) ? partidasRes : (partidasRes?.data || []);

      const combined = [];
      for (const g of gastos) combined.push(normalize(g, 'gasto'));
      for (const p of partidas) combined.push(normalize(p, 'partida'));

      setRecords(combined);
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
      // filter by selected category if any
      if (selectedCategory && selectedCategory !== 'todas' && (r.categoria ?? r.category ?? 'otros') !== selectedCategory) continue;
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

    if (chartRef.current) {
      try { chartRef.current.destroy(); } catch (e) {}
      chartRef.current = null;
    }

    const ctx = canvasRef.current?.getContext?.('2d');
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: MESES,
        datasets: [
          { type: 'bar', label: 'Gastos', data: gastosData, backgroundColor: 'rgba(59,130,246,0.6)', borderColor: 'rgba(59,130,246,1)' },
          { type: 'line', label: 'Partidas', data: partidasData, borderColor: 'rgba(16,185,129,1)', backgroundColor: 'rgba(16,185,129,0.2)', tension: 0.3, fill: false }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { y: { beginAtZero: true } } }
    });
  }

  const totals = React.useMemo(() => {
    const byMonth = processByMonth(records);
    const totalG = byMonth.reduce((s, m) => s + m.gastos, 0);
    const totalP = byMonth.reduce((s, m) => s + m.partidas, 0);
    return { totalGastos: totalG, totalPartidas: totalP, diferencia: totalP - totalG };
  }, [records, year, selectedCategory]);

  // unified typography for dashboard summary cards
  const labelStyle = { fontSize: 13, color: '#666', fontFamily: 'inherit' };
  const amountStyle = { fontSize: 20, fontWeight: 700, fontFamily: 'inherit' };

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

  const categories = React.useMemo(() => {
    const s = new Set();
    for (const r of records) {
      s.add(r.categoria ?? r.category ?? 'otros');
    }
    return [...s].filter(Boolean).sort();
  }, [records]);

  // Rebuild chart when records, year or selectedCategory change
  useEffect(() => {
    buildChart(records);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, year, selectedCategory]);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 12 }}>
        {/* <h2>Bienvenido al Sistema de Control de Presupuestos</h2>
        <p>Selecciona un módulo del menú izquierdo para comenzar.</p> */}
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label>Año</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: '100%', padding: 8 }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label>Categoría</label>
            <select style={{ width: '100%', padding: 8 }} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="todas">Todas las categorías</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
        </div>
      </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div style={{ padding: 20, borderRadius: 10, background: '#fff' }}>
              <div style={labelStyle}>Total Gastos</div>
              <div style={amountStyle}>${totals.totalGastos.toLocaleString()}</div>
            </div>
            <div style={{ padding: 20, borderRadius: 10, background: '#fff' }}>
              <div style={labelStyle}>Total Partidas</div>
              <div style={amountStyle}>${totals.totalPartidas.toLocaleString()}</div>
            </div>
            <div style={{ padding: 20, borderRadius: 10, background: '#fff' }}>
              <div style={labelStyle}>Diferencia</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={amountStyle}>${totals.diferencia.toLocaleString()}</div>
                {(() => {
                  const pct = totals.totalPartidas ? (totals.diferencia / totals.totalPartidas) * 100 : 0;
                  const pctText = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <div style={labelStyle}>Porcentaje</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <div style={{
                            fontSize: 14,
                            fontWeight: 700,
                            fontFamily: 'inherit',
                            color: '#fff',
                            backgroundColor: pct >= 0 ? '#16a34a' : '#dc2626',
                            padding: '6px 10px',
                            borderRadius: 6,
                            minWidth: 72,
                            textAlign: 'center'
                          }}>{pctText}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', padding: 20, borderRadius: 10, height: 420 }}>
            <h3>Comparativo Mensual {year}</h3>
            <div style={{ position: 'relative', height: '340px' }}>
              <canvas ref={canvasRef} id="mainChart"></canvas>
            </div>
          </div>
    </div>
  );
}
