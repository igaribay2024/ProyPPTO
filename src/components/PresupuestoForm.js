import React, { useState, useEffect } from 'react';
import { createPresupuesto, updatePresupuesto } from '../services/presupuestoService';

export default function PresupuestoForm({ cargarPresupuestos, editPresupuesto, setEditPresupuesto }) {
  const [form, setForm] = useState({
    nombre: '',
    anno: '',
    fecha_ini: '',
    fecha_fin: '',
    status: '',
    descripcion: '',
    tipo_cambio: '',
    factor_inflacion: '',
    observaciones: ''
  });

  // Si editPresupuesto cambia, actualiza el formulario para edición
  useEffect(() => {
    if (editPresupuesto) setForm(editPresupuesto);
    else setForm({
      nombre: '',
      anno: '',
      fecha_ini: '',
      fecha_fin: '',
      status: '',
      descripcion: '',
      tipo_cambio: '',
      factor_inflacion: '',
      observaciones: ''
    });
  }, [editPresupuesto]);

  // Maneja cambios en los campos
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  // Envía el formulario (crear o actualizar)
  const handleSubmit = async e => {
    e.preventDefault();
    if (editPresupuesto) {
      await updatePresupuesto(editPresupuesto.idpresupuesto, form);
      setEditPresupuesto(null);
    } else {
      await createPresupuesto(form);
    }
    setForm({
      nombre: '',
      anno: '',
      fecha_ini: '',
      fecha_fin: '',
      status: '',
      descripcion: '',
      tipo_cambio: '',
      factor_inflacion: '',
      observaciones: ''
    });
    cargarPresupuestos();
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
      <h3>{editPresupuesto ? 'Editar presupuesto' : 'Nuevo presupuesto'}</h3>
      <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" required />
      <input name="anno" value={form.anno} onChange={handleChange} placeholder="Año" required />
      <input name="fecha_ini" type="date" value={form.fecha_ini} onChange={handleChange} placeholder="Fecha inicio" required />
      <input name="fecha_fin" type="date" value={form.fecha_fin} onChange={handleChange} placeholder="Fecha fin" required />
      <input name="status" value={form.status} onChange={handleChange} placeholder="Estatus" required />
      <input name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Descripción" required />
      <input name="tipo_cambio" value={form.tipo_cambio} onChange={handleChange} placeholder="Tipo de cambio" />
      <input name="factor_inflacion" value={form.factor_inflacion} onChange={handleChange} placeholder="Factor de inflación" />
      <input name="observaciones" value={form.observaciones} onChange={handleChange} placeholder="Observaciones" />
      <button type="submit">{editPresupuesto ? 'Actualizar' : 'Crear'}</button>
      {editPresupuesto && (
        <button type="button" onClick={() => setEditPresupuesto(null)} style={{ marginLeft: '1rem' }}>
          Cancelar edición
        </button>
      )}
    </form>
  );
}