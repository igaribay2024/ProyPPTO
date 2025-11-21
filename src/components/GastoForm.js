import React, { useState, useEffect } from 'react';
import { createGasto, updateGasto } from '../services/gastoService';
import resourceService from '../services/resourceService';
import { useToast } from '../components/ToastProvider';

export default function GastoForm({ cargarGastos, editGasto, setEditGasto }) {
  const toast = useToast();
  const [form, setForm] = useState({
    nombre: '',
    anno: '',
    fecha: '',
    proveedor: '',
    monto: '',
    moneda: '',
    tipo_cambio: '',
    monto_base: '',
    status: '',
    tipo: '',
    categoria: '',
    idusuario: '',
    idcuenta: '',
    idplanta: '',
    idpresupuesto: ''
  });

  useEffect(() => {
    if (editGasto) setForm(editGasto);
  }, [editGasto]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    // validate fecha / anno consistency
    const parseFecha = (v) => {
      if (!v) return null;
      const s = String(v).trim();
      // dd/mm/yyyy
      const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m1) return new Date(Number(m1[3]), Number(m1[2]) - 1, Number(m1[1]));
      // yyyy-mm-dd or ISO
      const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m2) return new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]));
      // fallback: try Date parse
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    const fechaObj = parseFecha(form.fecha);
    const yearFromFecha = fechaObj ? fechaObj.getFullYear() : null;
    const annoValue = form.anno ? String(form.anno).trim() : '';
    if (annoValue && yearFromFecha && String(yearFromFecha) !== annoValue) {
      try { toast?.add(`El año (${annoValue}) no coincide con la Fecha (${form.fecha}). Corrija la fecha o el año.`, 'error', 6000); } catch (e) { alert(`El año (${annoValue}) no coincide con la Fecha (${form.fecha}). Corrija la fecha o el año.`); }
      return;
    }

    // validate presupuesto year if idpresupuesto provided
    if (form.idpresupuesto) {
      try {
        const pres = await resourceService.get('presupuestos', form.idpresupuesto);
        const presAnno = pres?.anno ?? pres?.year ?? null;
        if (presAnno && yearFromFecha && String(presAnno) !== String(yearFromFecha)) {
          try { toast?.add(`El presupuesto seleccionado (Año ${presAnno}) no coincide con la Fecha del gasto (${yearFromFecha}). Cambie presupuesto o fecha.`, 'error', 6000); } catch (e) { alert(`El presupuesto seleccionado (Año ${presAnno}) no coincide con la Fecha del gasto (${yearFromFecha}). Cambie presupuesto o fecha.`); }
          return;
        }
      } catch (err) {
        try { toast?.add('No se pudo validar el presupuesto seleccionado. Verifique el idpresupuesto.', 'error', 6000); } catch (e) { alert('No se pudo validar el presupuesto seleccionado. Verifique el idpresupuesto.'); }
        return;
      }
    }

    if (editGasto) {
      await updateGasto(editGasto.idgasto, form);
      setEditGasto(null);
    } else {
      await createGasto(form);
    }
    setForm({
      nombre: '', anno: '', fecha: '', proveedor: '', monto: '', moneda: '', tipo_cambio: '', monto_base: '', status: '', tipo: '', categoria: '', idusuario: '', idcuenta: '', idplanta: '', idpresupuesto: ''
    });
    cargarGastos();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" required />
      <input name="anno" value={form.anno} onChange={handleChange} placeholder="Año" required />
      <input name="fecha" value={form.fecha} onChange={handleChange} placeholder="Fecha" required />
      <input name="proveedor" value={form.proveedor} onChange={handleChange} placeholder="Proveedor" required />
      <input name="monto" value={form.monto} onChange={handleChange} placeholder="Monto" required />
      <input name="moneda" value={form.moneda} onChange={handleChange} placeholder="Moneda" required />
      <input name="tipo_cambio" value={form.tipo_cambio} onChange={handleChange} placeholder="Tipo de cambio" />
      <input name="monto_base" value={form.monto_base} onChange={handleChange} placeholder="Monto base" />
      <input name="status" value={form.status} onChange={handleChange} placeholder="Status" required />
      <input name="tipo" value={form.tipo} onChange={handleChange} placeholder="Tipo" required />
      <input name="categoria" value={form.categoria} onChange={handleChange} placeholder="Categoría" />
      <input name="idusuario" value={form.idusuario} onChange={handleChange} placeholder="ID Usuario" required />
      <input name="idcuenta" value={form.idcuenta} onChange={handleChange} placeholder="ID Cuenta" required />
      <button type="submit">{editGasto ? 'Actualizar' : 'Crear'}</button>
        {editGasto && (
          <button type="button" onClick={() => setEditGasto(null)} style={{ marginLeft: '1rem' }}>
          Cancelar edición
          </button>
      )}
    </form>
  );
}
