import React, { useMemo, useState, useEffect } from 'react';
import api from '../services/api';

// meta: optional array of column descriptions from /api/meta/:resource
export default function ResourceForm({ initial = {}, meta = null, onCancel, onSubmit }) {
  // optional `resource` prop allows resource-specific rendering
  const resource = arguments[0]?.resource;
  // Build field list either from meta (preferred) or from initial keys
  const fieldList = useMemo(() => {
    if (meta && Array.isArray(meta)) {
      // When creating a new record, some PK-like fields may be present in meta but
      // left empty in `initial`. Omit id-like fields that are empty to avoid sending
      // accidental primary-key values and to prevent PUT to /resource/ (no id).
      const keys = meta
        .filter(c => !(c.Extra || '').toLowerCase().includes('auto_increment'))
        .map(c => c.Field);
      // If initial has an id-like key with a truthy value, keep it.
      // Additionally, include id-like keys that are required by the DB (NOT NULL and no default)
      return keys.filter(k => {
        if (/id/i.test(k)) {
          const val = initial && Object.prototype.hasOwnProperty.call(initial, k) ? initial[k] : undefined;
          if (val !== undefined && val !== null && String(val).trim() !== '') return true;
          // find column meta
          const col = meta.find(c => c.Field === k);
          if (col && col.Null === 'NO' && (col.Default === null || col.Default === undefined)) return true;
          return false;
        }
        return true;
      });
    }
    // Fallback: use initial keys but omit id-like keys with empty values
    return Object.keys(initial).filter(k => {
      if (/id/i.test(k)) {
        const val = initial[k];
        return val !== undefined && val !== null && String(val).trim() !== '';
      }
      return true;
    });
  }, [meta, initial]);

  const makeInitial = () => {
    const obj = {};
    if (meta && Array.isArray(meta)) {
      for (const c of meta) {
        if ((c.Extra || '').toLowerCase().includes('auto_increment')) continue;
        const name = c.Field;
        if (initial && initial[name] !== undefined) obj[name] = initial[name];
        else {
          const t = (c.Type || '').toLowerCase();
          if (t.includes('int')) obj[name] = '';
          else if (t.includes('date')) obj[name] = '';
          else obj[name] = '';
        }
      }
    } else {
      fieldList.forEach(k => { obj[k] = initial[k] ?? ''; });
      if (fieldList.length === 0) {
        obj.nombre = initial.nombre || '';
        obj.descripcion = initial.descripcion || '';
      }
    }
    return obj;
  };

  const [data, setData] = useState(makeInitial);

  useEffect(() => {
    setData(makeInitial());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, initial]);

  // For usuarios, fetch tipo_usuario options when we have the tipo_id field in meta
  const [tipoOptions, setTipoOptions] = useState([]);
  useEffect(() => {
    let mounted = true;
    const hasTipoId = meta && Array.isArray(meta) && meta.some(c => c.Field === 'tipo_id');
    if (resource === 'usuarios' && hasTipoId) {
      api.get('/api/tipo_usuario').then(r => {
        if (!mounted) return;
        setTipoOptions(Array.isArray(r.data) ? r.data : []);
      }).catch(() => {
        if (!mounted) return;
        setTipoOptions([]);
      });
    }
    return () => { mounted = false; };
  }, [meta, resource]);

  // Lookup options for common FK fields used in gastos
  const [lookupOptions, setLookupOptions] = useState({});
  useEffect(() => {
    let mounted = true;
    if (!meta || !Array.isArray(meta)) return undefined;
    const lookups = {
      idusuario: '/api/usuarios',
      idcuenta: '/api/cuentas',
      idplanta: '/api/plantas',
      idpresupuesto: '/api/presupuestos',
    };
    const toFetch = Object.keys(lookups).filter(f => fieldList.includes(f));
    if (toFetch.length === 0) return undefined;
    (async () => {
      const resMap = {};
      for (const f of toFetch) {
        try {
          const r = await api.get(lookups[f]);
          if (!mounted) return;
          const arr = Array.isArray(r.data) ? r.data : [];
          // map to { value, label }
          const opts = arr.map(item => {
            if (f === 'idusuario') return { value: item.idusuario ?? item.id ?? item.idUsuario ?? item.idUsuario, label: item.nombre || item.email || item.idusuario || item.id };
            if (f === 'idpresupuesto') return { value: item.idpresupuesto ?? item.id ?? item.idPresupuesto, label: item.nombre || item.descripcion || item.idpresupuesto || item.id };
            if (f === 'idcuenta') return { value: item.idcuenta ?? item.id ?? item.idCuenta, label: item.nombre || item.descripcion || item.idcuenta || item.id };
            if (f === 'idplanta') return { value: item.idplanta ?? item.id ?? item.idPlanta, label: item.nombre || item.descripcion || item.idplanta || item.id };
            return { value: item.id ?? item.idusuario, label: item.nombre || item.email || item.id };
          });
          resMap[f] = opts;
        } catch (e) {
          resMap[f] = [];
        }
      }
      if (!mounted) return;
      setLookupOptions(resMap);
    })();
    return () => { mounted = false; };
  }, [meta, fieldList]);

  const handleChange = (k, v) => setData(prev => ({ ...prev, [k]: v }));

  const handleAddField = () => {
    const key = window.prompt('Nombre del campo:');
    if (!key) return;
    setData(prev => ({ ...prev, [key]: '' }));
  };

  const submit = (e) => {
    e.preventDefault();
    const normalized = {};
    for (const k of Object.keys(data)) {
      let v = data[k];
      const col = meta && Array.isArray(meta) ? meta.find(c => c.Field === k) : null;
      const type = (col && col.Type) ? col.Type.toLowerCase() : '';

      // date handling: ensure yyyy-mm-dd
      if (type.includes('date') && v) {
        const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) v = `${m[3]}-${m[2]}-${m[1]}`;
      }

      // numeric coercion
      if (type.match(/int|float|double|decimal/)) {
        if (v === '') v = null;
        else if (typeof v === 'string') {
          const n = Number(v);
          if (!Number.isNaN(n)) v = n;
        }
      }

      normalized[k] = v;
    }

    onSubmit(normalized);
  };

  const renderField = (k) => {
    const col = meta && Array.isArray(meta) ? meta.find(c => c.Field === k) : null;
    const type = col && col.Type ? col.Type.toLowerCase() : '';
    const value = data[k] ?? '';

    // If usuarios.tipo_id field, render a select populated from tipoOptions
    if (resource === 'usuarios' && k === 'tipo_id') {
      return (
        <select value={value ?? ''} onChange={e => handleChange(k, e.target.value)} style={{ width: '100%', padding: 6 }}>
          <option value="">(seleccionar)</option>
          {tipoOptions.map(o => <option key={o.idtipo} value={o.idtipo}>{o.nombre} ({o.codigo})</option>)}
        </select>
      );
    }
    // For FK lookup fields, render selects when options are available
    if (['idusuario','idcuenta','idplanta','idpresupuesto'].includes(k)) {
      const opts = lookupOptions[k] || [];
      return (
        <select value={value ?? ''} onChange={e => handleChange(k, e.target.value)} style={{ width: '100%', padding: 6 }}>
          <option value="">(seleccionar)</option>
          {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    if (type.includes('date')) {
      // value may be yyyy-mm-dd or empty
      const val = value ? String(value).slice(0, 10) : '';
      return (
        <input type="date" value={val} onChange={e => handleChange(k, e.target.value)} style={{ width: '100%', padding: 6 }} />
      );
    }

    if (type.match(/int/)) {
      return (
        <input type="number" step="1" value={value ?? ''} onChange={e => handleChange(k, e.target.value)} style={{ width: '100%', padding: 6 }} />
      );
    }

    if (type.match(/float|double|decimal/)) {
      return (
        <input type="number" step="any" value={value ?? ''} onChange={e => handleChange(k, e.target.value)} style={{ width: '100%', padding: 6 }} />
      );
    }

    // special-case common fields
    if (k.toLowerCase() === 'status') {
      const opts = ['Pendiente', 'Cancelado', 'Realizado', 'Proceso', 'Activo', 'Activa'];
      return (
        <select value={value ?? ''} onChange={e => handleChange(k, e.target.value)} style={{ width: '100%', padding: 6 }}>
          <option value="">(seleccionar)</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }

    return (
      <input type="text" value={value ?? ''} onChange={e => handleChange(k, e.target.value)} style={{ width: '100%', padding: 6 }} />
    );
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 800 }}>
      {fieldList.map((k) => (
        <div key={k} style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#333' }}>{k}</label>
          {renderField(k)}
        </div>
      ))}

      <div style={{ marginTop: 8 }}>
        <button type="button" onClick={handleAddField}>Agregar campo</button>
        <button type="submit" style={{ marginLeft: 8 }}>Guardar</button>
        <button type="button" onClick={onCancel} style={{ marginLeft: 8 }}>Cancelar</button>
      </div>
    </form>
  );
}
