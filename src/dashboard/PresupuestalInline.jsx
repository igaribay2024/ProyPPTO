import React, { useEffect, useRef, useState } from 'react';
import { getGastos } from '../services/gastoService';
import { getPartidas } from '../services/partidaService';

// A lightweight inline version of the Presupuestal dashboard.
// This will dynamically load Chart.js and render a minimal chart and header.
export default function PresupuestalInline() {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // inject CSS similar to the original
    const style = document.createElement('style');
    style.textContent = `
      .pi-wrap { padding: 24px; font-family: Inter, Roboto, sans-serif; }
      .pi-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
      .pi-metrics { display:flex; gap:12px; margin-bottom:20px; }
      .pi-card { padding:16px; border-radius:8px; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,0.06); }
      .pi-chart { background:#fff; padding:24px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.06); }
    `;
    document.head.appendChild(style);

    // create minimal DOM inside root
    if (rootRef.current) {
      rootRef.current.innerHTML = `
        <div class="pi-wrap">
          <div class="pi-header">
            <div>
              <h1 style="margin:0; font-size:20px">Dashboard Presupuestal (inline)</h1>
              <p style="margin:4px 0 0 0; color:#666">Versión embebida directamente en React</p>
            </div>
            <div style="display:flex; gap:8px; align-items:center">
              <button id="pi-export" style="padding:8px 12px; border-radius:8px; background:#64748b; color:#fff; border:none; cursor:pointer">Exportar PDF</button>
            </div>
          </div>

          <div class="pi-metrics">
            <div class="pi-card">Total Gastos<br><strong id="pi-gastos">$0</strong></div>
            <div class="pi-card">Total Partidas<br><strong id="pi-partidas">$0</strong></div>
            <div class="pi-card">Diferencia<br><strong id="pi-diff">$0</strong></div>
          </div>

          <div class="pi-chart">
            <canvas id="pi-chart-canvas" style="width:100%; height:300px"></canvas>
          </div>
        </div>
      `;
    }

    // helper to dynamically load script
    function loadScript(src){
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load ' + src));
        document.head.appendChild(s);
      });
    }

    let chartInstance = null;

    async function initChart() {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/chart.js');
      } catch (e) {
        console.warn('Chart.js load failed', e);
        return;
      }
      const Chart = window.Chart;
      const ctx = document.getElementById('pi-chart-canvas');
      if (!ctx) return;

      const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      const gastos = [0,0,0,0,0,0,0,0,0,0,0,0];
      const partidas = [0,0,0,0,0,0,0,0,0,0,0,0];

      chartInstance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
          labels: months,
          datasets: [
            { type: 'bar', label: 'Gastos', data: gastos, backgroundColor: 'rgba(59,130,246,0.6)' },
            { type: 'line', label: 'Partidas', data: partidas, borderColor: '#10b981', fill: false }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });

      // update metric placeholders (still zeros until data is fed)
      document.getElementById('pi-gastos').textContent = '$0';
      document.getElementById('pi-partidas').textContent = '$0';
      document.getElementById('pi-diff').textContent = '$0';

      // after creating chart, fetch real data
      fetchAndPopulate();

      setLoaded(true);
    }

    async function safeGet(promise) {
      try {
        const res = await promise;
        return res && res.data ? res.data : [];
      } catch (err) {
        console.warn('fetch error', err);
        return [];
      }
    }

    async function fetchAndPopulate() {
      const gastosData = await safeGet(getGastos());
      const partidasData = await safeGet(getPartidas());

      const gastosArr = [0,0,0,0,0,0,0,0,0,0,0,0];
      const partidasArr = [0,0,0,0,0,0,0,0,0,0,0,0];

      function extractMonth(rec){
        if (rec.mes != null) return parseInt(rec.mes,10) - 1;
        if (rec.fecha) return new Date(rec.fecha).getMonth();
        return 0;
      }

      function extractAmount(rec){
        const keys = ['monto','cantidad','importe','amount','valor'];
        for (const k of keys) if (rec[k] != null) return parseFloat(rec[k]) || 0;
        // sometimes value can be nested
        if (rec.data && rec.data.monto) return parseFloat(rec.data.monto) || 0;
        return 0;
      }

      for (const g of gastosData) {
        const m = extractMonth(g);
        if (m >=0 && m < 12) gastosArr[m] += extractAmount(g);
      }

      for (const p of partidasData) {
        const m = extractMonth(p);
        if (m >=0 && m < 12) partidasArr[m] += extractAmount(p);
      }

      // update chart datasets
      try{
        if (chartInstance) {
          chartInstance.data.datasets[0].data = gastosArr;
          chartInstance.data.datasets[1].data = partidasArr;
          chartInstance.update();
        }
      }catch(e){ console.warn('chart update failed', e); }

      // update metrics
      const totalG = gastosArr.reduce((s,n)=>s+n,0);
      const totalP = partidasArr.reduce((s,n)=>s+n,0);
      const diff = totalP - totalG;
      const fmt = (v) => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:0}).format(v);
      const gEl = document.getElementById('pi-gastos'); if (gEl) gEl.textContent = fmt(totalG);
      const pEl = document.getElementById('pi-partidas'); if (pEl) pEl.textContent = fmt(totalP);
      const dEl = document.getElementById('pi-diff'); if (dEl) dEl.textContent = fmt(diff);
    }

    initChart();

    // Export PDF using html2canvas + jspdf: load libs dynamically
    async function initExport(){
      try{
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }catch(e){ console.warn('Export libs failed', e); }

      const btn = document.getElementById('pi-export');
      if (btn) btn.onclick = async function(){
        try{
          const el = rootRef.current;
          const canvas = await window.html2canvas(el, { scale: 2, useCORS: true });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new window.jspdf.jsPDF('l','mm','a4');
          const imgWidth = 297;
          const pageHeight = 210;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          pdf.addImage(imgData,'PNG',0,0,imgWidth,imgHeight);
          pdf.save('dashboard-presupuestal-inline.pdf');
        }catch(err){ console.error(err); }
      };
    }

    initExport();

    // cleanup on unmount
    return () => {
      try{ if (chartInstance) chartInstance.destroy(); }catch(e){}
      if (style && style.parentNode) style.parentNode.removeChild(style);
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <div ref={rootRef} />
      {!loaded && <div style={{ padding: 12, color: '#666' }}>Cargando (inline)...</div>}
    </div>
  );
}
