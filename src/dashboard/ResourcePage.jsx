import React, { useEffect, useState } from 'react';
import resourceService from '../services/resourceService';
import api from '../services/api';
import ResourceForm from './ResourceForm';

export default function ResourcePage({ resource, onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [meta, setMeta] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await resourceService.list(resource);
      setItems(data);
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    fetchMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  const fetchMeta = async () => {
    try {
      const resp = await api.get(`/api/meta/${resource}`);
      setMeta(resp.data);
    } catch (err) {
      // ignore meta errors; resource fallback will still work
      setMeta(null);
    }
  };

  const handleCreate = async () => {
    // Build an initial object from meta when available so the form matches DB
    const year = new Date().getFullYear();
    const today = new Date();
    const endOfYear = new Date(year, 11, 31);
    const fmt = (d) => d.toISOString().slice(0, 10);

    if (meta && Array.isArray(meta)) {
      const obj = {};
      const defaultStatus = {
        presupuestos: 'Pendiente',
        gastos: 'Pendiente',
        usuarios: 'Activo',
        conceptos: 'Activo',
        cuentas: 'Activa',
        partidas: 'Pendiente',
        plantas: 'Activa',
      }[resource] || '';

      for (const c of meta) {
        if ((c.Extra || '').toLowerCase().includes('auto_increment')) continue;
        const name = c.Field;
        const type = (c.Type || '').toLowerCase();
        if (name.toLowerCase() === 'anno') obj[name] = year;
        else if (type.includes('date')) {
          if (name.toLowerCase().includes('ini')) obj[name] = fmt(today);
          else if (name.toLowerCase().includes('fin')) obj[name] = fmt(endOfYear);
          else obj[name] = '';
        } else if (name.toLowerCase() === 'status') obj[name] = defaultStatus;
        else obj[name] = '';
      }
      setEditing(obj);
      return;
    }

    // fallback to previous heuristics
    setEditing({});
  };

  const handleEdit = async (item) => {
    // ensure meta loaded so ResourceForm can render appropriately
    if (!meta) await fetchMeta();
    setEditing(item);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar registro?')) return;
    try {
      await resourceService.remove(resource, id);
      await load();
    } catch (err) {
      alert('Error al eliminar: ' + (err.message || err));
    }
  };

  const handleSubmit = async (data) => {
    try {
      // Determine primary-key-like field name (e.g. id, idgasto, idpresupuesto)
      const pkKey = editing && Object.keys(editing || {}).find(k => /id/i.test(k));
      // Only treat as update when the pk exists AND has a non-empty value
      const hasPkValue = pkKey && editing[pkKey] !== undefined && editing[pkKey] !== null && String(editing[pkKey]).trim() !== '';
      if (hasPkValue) {
        await resourceService.update(resource, editing[pkKey], data);
      } else {
        await resourceService.create(resource, data);
      }
      setEditing(null);
      await load();
    } catch (err) {
      // Better error handling for validation (400) responses
      const resp = err?.response?.data;
      if (err?.response?.status === 400 && resp) {
        // If server returned allowed options (e.g., for tipo), show them
        if (resp.allowed) {
          const opts = resp.allowed.map(o => `${o.idtipo}: ${o.nombre} (${o.codigo})`).join('\n');
          alert(`Error: ${resp.message} - provided: ${resp.provided}\nAllowed:\n${opts}`);
        } else if (resp.missing) {
          alert(`Missing required fields: ${resp.missing.join(', ')}`);
        } else {
          alert(`Validation error: ${resp.message || JSON.stringify(resp)}`);
        }
      } else {
        alert('Save error: ' + (err.message || err));
      }
    }
  };

  const pkKey = items && items.length > 0 ? Object.keys(items[0]).find(k => /id/i.test(k)) : 'id';

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <button onClick={onBack}>← Volver</button>
        <h2 style={{ display: 'inline-block', marginLeft: 12 }}>{resource.toUpperCase()}</h2>
      </div>

      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={{ marginBottom: 12 }}>
        <button onClick={handleCreate}>Nuevo</button>
        <button onClick={load} style={{ marginLeft: 8 }}>Refrescar</button>
      </div>

      {loading ? (
        <div>Cargando...</div>
      ) : editing ? (
        <ResourceForm resource={resource} initial={editing} meta={meta} onCancel={() => setEditing(null)} onSubmit={handleSubmit} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {(items[0] ? Object.keys(items[0]) : ['#']).map((k) => (
                  <th key={k} style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: 6 }}>{k}</th>
                ))}
                <th style={{ borderBottom: '1px solid #ccc', padding: 6 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it[pkKey] || JSON.stringify(it)}>
                  {(items[0] ? Object.keys(items[0]) : ['#']).map((k) => (
                    <td key={k} style={{ padding: 6, borderBottom: '1px solid #f0f0f0' }}>{String(it[k])}</td>
                  ))}
                  <td style={{ padding: 6 }}>
                    <button onClick={() => handleEdit(it)}>Editar</button>
                    <button onClick={() => handleDelete(it[pkKey])} style={{ marginLeft: 8 }}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
