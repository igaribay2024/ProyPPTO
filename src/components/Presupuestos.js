import React, { useEffect, useState } from 'react';
import { getPresupuestos, deletePresupuesto } from '../services/presupuestoService';
import PresupuestoForm from './PresupuestoForm';
import Collapse from '@mui/material/Collapse';

export default function Presupuestos() {
  const [presupuestos, setPresupuestos] = useState([]);
  const [editPresupuesto, setEditPresupuesto] = useState(null);
  const [openIds, setOpenIds] = useState({});

  useEffect(() => {
    cargarPresupuestos();
  }, []);

  const cargarPresupuestos = async () => {
    const res = await getPresupuestos();
    setPresupuestos(res.data);
  };

  const handleDelete = async (id) => {
    await deletePresupuesto(id);
    cargarPresupuestos();
  };

  const toggleOpen = (id) => {
    setOpenIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      <h2>Presupuestos</h2>
      <PresupuestoForm cargarPresupuestos={cargarPresupuestos} editPresupuesto={editPresupuesto} setEditPresupuesto={setEditPresupuesto} />
      <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
        {presupuestos.map(p => (
          <li key={p.idpresupuesto} style={{ marginBottom: 8, border: '1px solid #eee', padding: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{p.nombre}</strong> — <span style={{ color: '#666' }}>{p.status}</span>
              </div>
              <div>
                <button onClick={() => toggleOpen(p.idpresupuesto)} style={{ marginRight: 8 }}>{openIds[p.idpresupuesto] ? 'Ocultar' : 'Detalles'}</button>
                <button onClick={() => setEditPresupuesto(p)}>Editar</button>
                <button onClick={() => handleDelete(p.idpresupuesto)} style={{ marginLeft: 8 }}>Eliminar</button>
              </div>
            </div>
            <Collapse in={!!openIds[p.idpresupuesto]} timeout="auto" unmountOnExit>
              <div style={{ marginTop: 8 }}>
                <div><strong>Año:</strong> {p.anno}</div>
                <div><strong>Fecha inicio:</strong> {p.fecha_ini}</div>
                <div><strong>Fecha fin:</strong> {p.fecha_fin}</div>
                <div><strong>Descripción:</strong> {p.descripcion}</div>
                <div><strong>Observaciones:</strong> {p.observaciones}</div>
              </div>
            </Collapse>
          </li>
        ))}
      </ul>
    </div>
  );
}