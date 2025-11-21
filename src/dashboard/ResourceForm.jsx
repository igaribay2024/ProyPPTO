import React, { useMemo, useState, useEffect } from 'react';
import api from '../services/api';
import resourceService from '../services/resourceService';
import { useToast } from '../components/ToastProvider';

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
  const toast = useToast();

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

  // map raw field keys to user-friendly labels
  const prettyLabel = (k) => {
    if (!k) return '';
    const map = {
      nombre: 'Nombre',
      anno: 'Año',
      fecha_ini: 'Fecha Inicio',
      fecha_fin: 'Fecha Fin',
      status: 'Status',
      descripcion: 'Descripción',
      tipo_cambio: 'Tipo de Cambio',
      factor_inflacion: 'Factor de Inflación',
      observaciones: 'Observaciones',
      telefono: 'Teléfono',
      secret: 'Secreto'
    };
    if (map[k]) return map[k];
    const s = String(k).replace(/_/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  // duplicate year validation for presupuestos
  const [duplicateAnno, setDuplicateAnno] = useState(false);
  const [annoMessage, setAnnoMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    const pkKey = Object.keys(initial || {}).find(k => /id/i.test(k));
    const check = async () => {
      if (resource !== 'presupuestos') return;
      const año = data.anno ?? '';
      const añoStr = String(año || '').trim();
      if (!añoStr) {
        if (mounted) { setDuplicateAnno(false); setAnnoMessage(''); }
        return;
      }
      try {
        const r = await api.get('/api/presupuestos');
        if (!mounted) return;
        const arr = Array.isArray(r.data) ? r.data : [];
        const found = arr.find(it => String(it.anno) === añoStr);
        if (found) {
          // if editing the same record, allow it
          if (pkKey && initial && (String(initial[pkKey]) === String(found[pkKey]) || String(initial[pkKey]) === String(found.id) )) {
            setDuplicateAnno(false);
            setAnnoMessage('');
          } else {
            setDuplicateAnno(true);
            setAnnoMessage(`Ya existe un presupuesto con el año ${añoStr}`);
          }
        } else {
          setDuplicateAnno(false);
          setAnnoMessage('');
        }

        // auto-fill fecha_ini/fecha_fin and descripcion when user enters año
        const fechaIni = `${añoStr}-01-01`;
        const fechaFin = `${añoStr}-12-31`;
        setData(prev => {
          const next = { ...prev };
          if (!next.fecha_ini || String(next.fecha_ini).trim() === '') next.fecha_ini = fechaIni;
          if (!next.fecha_fin || String(next.fecha_fin).trim() === '') next.fecha_fin = fechaFin;
          if (!next.descripcion || String(next.descripcion).trim() === '') next.descripcion = `PRESUPUESTO DEL AÑO ${añoStr}`;
          return next;
        });
      } catch (e) {
        // ignore network errors for the inline check
        if (mounted) { setDuplicateAnno(false); setAnnoMessage(''); }
      }
    };
    check();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.anno, resource, initial]);

  const handleAddField = () => {
    const key = window.prompt('Nombre del campo:');
    if (!key) return;
    setData(prev => ({ ...prev, [key]: '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const normalized = {};
    for (const k of Object.keys(data)) {
      let v = data[k];
      const col = meta && Array.isArray(meta) ? meta.find(c => c.Field === k) : null;
      const type = (col && col.Type) ? col.Type.toLowerCase() : '';

      // date handling: ensure yyyy-mm-dd when possible
      if (type.includes('date') && v) {
        const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) v = `${m[3]}-${m[2]}-${m[1]}`;
        // normalize Date objects or ISO strings
        else if (v instanceof Date) v = v.toISOString().slice(0, 10);
        else if (String(v).includes('T')) v = String(v).slice(0, 10);
      }

      // numeric coercion: use meta when available, otherwise guess by field name
      const isNumericType = type.match(/int|float|double|decimal/);
      const nameLower = k.toLowerCase();
      const looksNumeric = /monto|importe|amount|costo|valor|precio|cantidad|total/.test(nameLower);
      if (isNumericType || (!type && looksNumeric)) {
        if (v === '') v = null;
        else if (typeof v === 'string') {
          // remove thousand separators and spaces
          const cleaned = v.replace(/\./g, '').replace(/,/g, '.').replace(/\s/g, '');
          const n = Number(cleaned);
          if (!Number.isNaN(n)) v = n;
        }
      }

      // id-like empty strings -> null so server can auto-generate
      if (/^id/i.test(k) && (v === '' || v === undefined)) v = null;

      // final trim for strings
      if (typeof v === 'string') v = v.trim();

      normalized[k] = v;
    }

    // resource-specific validations
    const parseFecha = (v) => {
      if (!v) return null;
      const s = String(v).trim();
      const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m1) return new Date(Number(m1[3]), Number(m1[2]) - 1, Number(m1[1]));
      const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m2) return new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]));
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    if (arguments[0]?.resource === 'gastos' || /* fallback when resource prop not passed */ false) {
      // Note: ResourceForm may be used generically; ResourcePage passes resource via arguments[0].resource
    }

    // If caller provided a resource prop via arguments (resource-aware wrapper), validate gastos
    const resourceArg = arguments[0]?.resource;
    if ((resourceArg === 'gastos') || (typeof resourceArg === 'undefined' && Object.keys(normalized).includes('fecha') && Object.keys(normalized).includes('anno'))) {
      try {
        const fechaVal = normalized.fecha || normalized.fecha_gasto || normalized.fecha_ini || '';
        const fechaObj = parseFecha(fechaVal);
        const yearFromFecha = fechaObj ? fechaObj.getFullYear() : null;
        const annoVal = normalized.anno ? String(normalized.anno) : '';
        if (annoVal && yearFromFecha && String(yearFromFecha) !== String(annoVal)) {
          try { toast?.add(`El año (${annoVal}) no coincide con la Fecha (${fechaVal}). Corrija la fecha o el año.`, 'error', 6000); } catch (e) { alert(`El año (${annoVal}) no coincide con la Fecha (${fechaVal}). Corrija la fecha o el año.`); }
          return;
        }
        const idpres = normalized.idpresupuesto || normalized.id_presupuesto || normalized.idpresupuesto;
        if (idpres) {
          // validate presupuesto's year
          try {
            const pres = await resourceService.get('presupuestos', idpres);
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
      } catch (err) {
        // swallow and continue to onSubmit; any parse errors will be handled server-side
      }
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
          <label style={{ display: 'block', fontSize: 12, color: '#333' }}>{prettyLabel(k)}</label>
          {renderField(k)}
          {resource === 'presupuestos' && k === 'anno' && annoMessage && (
            <div style={{ color: 'crimson', fontSize: 12, marginTop: 4 }}>{annoMessage}</div>
          )}
        </div>
      ))}

      <div style={{ marginTop: 8 }}>
        <button type="button" onClick={handleAddField}>Agregar campo</button>
        <button type="submit" style={{ marginLeft: 8 }} disabled={duplicateAnno}>Guardar</button>
        <button type="button" onClick={onCancel} style={{ marginLeft: 8 }}>Cancelar</button>
      </div>
    </form>
  );
}
