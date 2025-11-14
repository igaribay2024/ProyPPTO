import React, { useEffect, useState } from 'react';
import resourceService from '../services/resourceService';
import api from '../services/api';
import ResourceForm from './ResourceForm';
import Box from '@mui/material/Box';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DataGrid } from '@mui/x-data-grid';
import { useToast } from '../components/ToastProvider';
import { useNavigate } from 'react-router-dom';

export default function ResourcePage({ resource, onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [meta, setMeta] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();
  // If parent didn't provide an onBack handler, default to navigating to dashboard root
  const handleBack = onBack || (() => {
    try { navigate('/dashboard', { replace: true }); } catch (e) { try { window.location.href = '/dashboard'; } catch (e2) {} }
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await resourceService.list(resource);
      setItems(data);
      try { toast?.add(`Datos cargados: ${resource}`, 'success', 2500); } catch (e) {}
    } catch (err) {
      const msg = err?.message || 'Failed to load';
      setError(msg);
      try { toast?.add(`Error al cargar ${resource}: ${msg}`, 'error', 6000); } catch (e) {}
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
      try { toast?.add('Registro eliminado', 'success'); } catch (e) {}
    } catch (err) {
      const msg = err?.message || err;
      try { toast?.add('Error al eliminar: ' + msg, 'error', 6000); } catch (e) {}
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
      try { toast?.add('Registro guardado', 'success'); } catch (e) {}
    } catch (err) {
      // Better error handling for validation (400) responses
      const resp = err?.response?.data;
  if (err?.response?.status === 400 && resp) {
        // If server returned allowed options (e.g., for tipo), show them
        if (resp.allowed) {
          const opts = resp.allowed.map(o => `${o.idtipo}: ${o.nombre} (${o.codigo})`).join('\n');
          alert(`Error: ${resp.message} - provided: ${resp.provided}\nAllowed:\n${opts}`);
        } else if (resp.missing) {
          try { toast?.add(`Campos faltantes: ${resp.missing.join(', ')}`, 'error', 6000); } catch (e) {}
        } else {
          try { toast?.add(`Validation error: ${resp.message || JSON.stringify(resp)}`, 'error', 8000); } catch (e) {}
        }
      } else {
        try { toast?.add('Error al guardar: ' + (err.message || err), 'error', 8000); } catch (e) {}
      }
    }
  };

  // Small inline expandable list component used only for the simplified Presupuestos view
  const ExpandableList = ({ items, pkKey, displayFields = [], onEdit, onDelete }) => {
    const [expanded, setExpanded] = useState(null);

  // expansion handled via Accordion onChange

    return (
      <div>
        {items.map((it, idx) => {
          const id = it[pkKey] !== undefined && it[pkKey] !== null ? it[pkKey] : idx;
          const isOpen = expanded === id;
          return (
            <Accordion key={String(id)} expanded={isOpen} onChange={(e, expanded) => setExpanded(expanded ? id : null)}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                    {displayFields.map((f) => (
                      <div key={f} style={{ minWidth: 120 }}>
                        <strong>{(
                          {
                            nombre: 'Nombre',
                            descripcion: 'Descripción',
                            anno: 'Año',
                            fecha_ini: 'Fecha Inicial',
                            fecha_fin: 'Fecha Final',
                            fecha: 'Fecha',
                            status: 'Status',
                            tipo_cambio: 'Tipo de Cambio',
                            factor_inflacion: 'Factor de Inflación',
                            observaciones: 'Observaciones'
                          }[f] || (f === pkKey ? 'ID Presupuesto' : f)
                        )}:</strong> {String(it[f] ?? '')}
                      </div>
                    ))}
                  </div>

                  <div>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(it); }}>Editar</button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(it[pkKey]); }} style={{ marginLeft: 8 }}>Eliminar</button>
                  </div>
                </div>
              </AccordionSummary>
              <AccordionDetails>
                <div style={{ width: '100%' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {(() => {
                        const preferred = [
                          'nombre', 'descripcion', 'anno', pkKey, 'fecha_ini', 'fecha_fin', 'status', 'tipo_cambio', 'factor_inflacion', 'observaciones'
                        ];
                        const allKeys = Object.keys(it || {});
                        const ordered = [];
                        for (const k of preferred) {
                          if (k && allKeys.includes(String(k)) && !ordered.includes(String(k))) ordered.push(String(k));
                        }
                        for (const k of allKeys) if (!ordered.includes(k)) ordered.push(k);

                        const labelFor = (k) => ({
                          nombre: 'Nombre',
                          descripcion: 'Descripción',
                          anno: 'Año',
                          fecha_ini: 'Fecha Inicial',
                          fecha_fin: 'Fecha Final',
                          fecha: 'Fecha',
                          status: 'Status',
                          tipo_cambio: 'Tipo de Cambio',
                          factor_inflacion: 'Factor de Inflación',
                          observaciones: 'Observaciones'
                        }[k] || (k === pkKey ? 'ID Presupuesto' : k));

                        return ordered.map((k) => (
                          <tr key={k}>
                            <td style={{ width: 180, padding: '6px 8px', verticalAlign: 'top', color: '#333', fontWeight: 600 }}>{labelFor(k)}</td>
                            <td style={{ padding: '6px 8px', verticalAlign: 'top' }}>{String(it[k] === null || it[k] === undefined ? '' : it[k])}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </div>
    );
  };

  const pkKey = items && items.length > 0 ? Object.keys(items[0]).find(k => /id/i.test(k)) : 'id';

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
  <button onClick={handleBack}>← Volver</button>
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
        <div>
          {/* Special simplified expandable list for presupuestos */}
          {resource === 'presupuestos' && items && items.length > 0 ? (
            <div>
              {/* determine a few compact fields to show in the collapsed row */}
              {/** pick up to 3 meaningful fields heuristically **/}
              {(() => {
                const priority = ['codigo', 'nombre', 'titulo', 'descripcion', 'monto', 'anno', 'status', 'fecha_ini', 'fecha'];
                const keys = Object.keys(items[0] || {});
                const nonPk = keys.filter(k => k !== pkKey);
                const display = [];
                for (const p of priority) {
                  if (nonPk.includes(p) && display.length < 3) display.push(p);
                }
                for (const k of nonPk) {
                  if (display.length >= 3) break;
                  if (!display.includes(k)) display.push(k);
                }
                return (
                  <ExpandableList
                    items={items}
                    pkKey={pkKey}
                    displayFields={display}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                );
              })()}
            </div>
          ) : (
            <Box sx={{ height: 600, width: '100%' }}>
              {/* Build columns dynamically from the first item */}
              {items && items.length > 0 && (
                <DataGrid
                  rows={items.map((it, idx) => ({ ...it, id: it[pkKey] !== undefined && it[pkKey] !== null ? it[pkKey] : idx }))}
                  columns={[...Object.keys(items[0]).map((k) => ({ field: k, headerName: k, width: k === pkKey ? 90 : 150 })), { field: 'acciones', headerName: 'Acciones', width: 180, sortable: false, filterable: false, renderCell: (params) => (
                    <div>
                      <button onClick={() => handleEdit(params.row)}>Editar</button>
                      <button onClick={() => handleDelete(params.row[pkKey])} style={{ marginLeft: 8 }}>Eliminar</button>
                    </div>
                  ) }]
                  }
                  initialState={{
                    pagination: { paginationModel: { pageSize: 5 } }
                  }}
                  pageSizeOptions={[5, 10, 25]}
                  checkboxSelection
                  disableRowSelectionOnClick
                  autoHeight={false}
                />
              )}
              {/* If there are no items, still render an empty grid message */}
              {(!items || items.length === 0) && <div>No hay registros</div>}
            </Box>
          )}
        </div>
      )}
    </div>
  );
}
