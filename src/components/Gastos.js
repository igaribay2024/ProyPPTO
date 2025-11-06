import React, { useEffect, useState } from 'react';
import { getGastos, deleteGasto } from '../services/gastoService';
import GastoForm from './GastoForm';

export default function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [editGasto, setEditGasto] = useState(null);

  useEffect(() => {
    cargarGastos();
  }, []);

  const cargarGastos = async () => {
    const res = await getGastos();
    setGastos(res.data);
  };

  const handleDelete = async (id) => {
    await deleteGasto(id);
    cargarGastos();
  };

  return (
    <div>
      <h2>Gastos</h2>
      <GastoForm cargarGastos={cargarGastos} editGasto={editGasto} setEditGasto={setEditGasto} />
      <ul>
        {gastos.map(g => (
          <li key={g.idgasto}>
            {g.nombre} - {g.monto}
            <button onClick={() => setEditGasto(g)}>Editar</button>
            <button onClick={() => handleDelete(g.idgasto)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}