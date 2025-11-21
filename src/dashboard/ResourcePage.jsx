import React, { useEffect, useState, useMemo } from 'react';
import resourceService from '../services/resourceService';
import api from '../services/api';
import ResourceForm from './ResourceForm';
import Box from '@mui/material/Box';
import { DataGrid } from '@mui/x-data-grid';
import { useToast } from '../components/ToastProvider';
import { useNavigate } from 'react-router-dom';

export default function ResourcePage({ resource, onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(0);
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
      try { console.debug('ResourcePage.load', resource, Array.isArray(data) ? data.slice(0,3) : data); } catch (e) {}
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

  // reset pagination for expandable lists when resource or items change
  useEffect(() => {
    setPage(0);
  }, [resource, (items || []).length]);

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
    const startOfYear = new Date(year, 0, 1);
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
        else if (name.toLowerCase() === 'descripcion') obj[name] = `PRESUPUESTO DEL AÑO ${year}`;
        else if (type.includes('date')) {
          if (name.toLowerCase().includes('ini')) obj[name] = fmt(startOfYear);
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
        // resource-specific validation and defaults
        if (resource === 'presupuestos') {
          const año = data.anno ?? data.year ?? '';
          const añoStr = String(año || '').trim();
          if (añoStr) {
            // check for existing presupuesto with same year
            const exists = (items || []).some(it => String(it.anno) === añoStr);
            if (exists) {
              try { toast?.add(`Ya existe un presupuesto con el año ${añoStr}. Cambie el año.`, 'error', 6000); } catch (e) {}
              return;
            }
            // set sensible defaults if missing
            if (!data.fecha_ini) data.fecha_ini = `${añoStr}-01-01`;
            if (!data.fecha_fin) data.fecha_fin = `${añoStr}-12-31`;
            if (!data.descripcion) data.descripcion = `PRESUPUESTO DEL AÑO ${añoStr}`;
          }
        }
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
  // map raw field keys to user-friendly labels (available to the whole component)
  const prettyLabel = (k) => {
    if (!k) return '';
    const map = {
      nombre: 'Nombre',
      descripcion: 'Descripción',
      anno: 'Año',
      telefono: 'Teléfono',
      secret: 'Secreto'
    };
    if (map[k]) return map[k];
    const s = String(k).replace(/_/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  // Format dates for display as DD/MM/YYYY when possible
  const formatDateDisplay = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v).trim();
    // match ISO date YYYY-MM-DD (optionally with time)
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T| )/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    // match DD/MM/YYYY already
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
    return s;
  };

  const ExpandableList = ({ items, pkKey, displayFields = [], onEdit, onDelete }) => {
    const [expanded, setExpanded] = useState(null);

    const toggle = (id) => setExpanded(prev => (prev === id ? null : id));

    return (
      <div>
        {items.map((it, idx) => {
          const id = it[pkKey] !== undefined && it[pkKey] !== null ? it[pkKey] : idx;
          const isOpen = expanded === id;
          return (
            <div key={String(id)} style={{ border: '1px solid #e0e0e0', borderRadius: 6, marginBottom: 8, padding: 12, background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button aria-label={isOpen ? 'Cerrar' : 'Abrir'} onClick={() => toggle(id)} style={{ cursor: 'pointer' }}>{isOpen ? '▾' : '▸'}</button>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                    {displayFields.map((f) => (
                      <div key={f} style={{ minWidth: 120 }}><strong>{prettyLabel(f)}:</strong> {formatDateDisplay(it[f] ?? '')}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <button onClick={() => onEdit(it)}>Editar</button>
                  <button onClick={() => onDelete(it[pkKey])} style={{ marginLeft: 8 }}>Eliminar</button>
                </div>
              </div>

              {isOpen && (
                <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px dashed #ddd' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {Object.keys(it).map((k) => (
                        <tr key={k}>
                          <td style={{ width: 180, padding: '6px 8px', verticalAlign: 'top', color: '#333', fontWeight: 600 }}>{prettyLabel(k)}</td>
                          <td style={{ padding: '6px 8px', verticalAlign: 'top' }}>{formatDateDisplay(it[k] === null || it[k] === undefined ? '' : it[k])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
          {(resource === 'presupuestos' || resource === 'usuarios') && items && items.length > 0 ? (
            <div>
              {/* paginate the expandable list in blocks of 10 for readability */}
              {(() => {
                const pageSize = 10;
                const totalPages = Math.max(1, Math.ceil((items || []).length / pageSize));

                const priority = ['codigo', 'nombre', 'titulo', 'descripcion', 'monto', 'anno', 'status', 'fecha_ini', 'fecha'];
                const keys = Object.keys(items[0] || {});
                const nonPk = keys.filter(k => k !== pkKey);
                let display = [];
                // For usuarios prefer a specific order including email after telefono
                if (resource === 'usuarios') {
                  // hide sensitive fields from the compact preview; keep them available in the expanded view
                  const desired = ['nombre', 'status', 'telefono', 'email'];
                  display = desired.filter(d => nonPk.includes(d));
                } else {
                  for (const p of priority) {
                    if (nonPk.includes(p) && display.length < 3) display.push(p);
                  }
                  for (const k of nonPk) {
                    if (display.length >= 3) break;
                    if (!display.includes(k)) display.push(k);
                  }
                }

                const start = page * pageSize;
                const pageItems = (items || []).slice(start, start + pageSize);

                return (
                  <div>
                    <ExpandableList
                      items={pageItems}
                      pkKey={pkKey}
                      displayFields={display}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <div>Mostrando {start + 1} - {Math.min(start + pageSize, items.length)} de {items.length}</div>
                      <div>
                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Anterior</button>
                        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ marginLeft: 8 }}>Siguiente</button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <Box sx={{ height: 600, width: '100%' }}>
              {/* Build columns dynamically from the first item */}
              {items && items.length > 0 && (
                <DataGrid
                  rows={items.map((it, idx) => ({ ...it, id: it[pkKey] !== undefined && it[pkKey] !== null ? it[pkKey] : idx }))}
                  columns={[...Object.keys(items[0]).map((k) => {
                    const sample = items[0][k];
                    const col = { field: k, headerName: prettyLabel(k), width: k === pkKey ? 90 : 150 };
                    const isDateKey = k.toLowerCase().includes('fecha') || k.toLowerCase().includes('date');
                    const isIsoSample = typeof sample === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sample);
                    if (isDateKey || isIsoSample) {
                      col.renderCell = (params) => {
                        try { return formatDateDisplay(params.value); } catch (e) { return params.value ?? ''; }
                      };
                    }
                    return col;
                  }), { field: 'acciones', headerName: 'Acciones', width: 180, sortable: false, filterable: false, renderCell: (params) => (
                    <div>
                      <button onClick={() => handleEdit(params.row)}>Editar</button>
                      <button onClick={() => handleDelete(params.row[pkKey])} style={{ marginLeft: 8 }}>Eliminar</button>
                    </div>
                  ) }]
                  }
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10 } }
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
