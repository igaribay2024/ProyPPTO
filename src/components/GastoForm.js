import React, { useState, useEffect } from 'react';
import { createGasto, updateGasto } from '../services/gastoService';

export default function GastoForm({ cargarGastos, editGasto, setEditGasto }) {
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
