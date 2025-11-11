const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const bcrypt = require('bcryptjs');

// Helper to redact sensitive fields when logging
function redactLog(obj) {
  try {
    const c = { ...obj };
    ['password','password_hash','pass','clave'].forEach(k => { if (k in c) c[k] = '<<REDACTED>>'; });
    return c;
  } catch (e) { return obj; }
}

// Map resource names to table and primary key
const resources = {
  usuarios: { table: 'usuarios', pk: 'idusuario' },
  presupuestos: { table: 'presupuestos', pk: 'idpresupuesto' },
  gastos: { table: 'gastos', pk: 'idgasto' },
  conceptos: { table: 'conceptos', pk: 'idconcepto' },
  cuentas: { table: 'cuentas', pk: 'idcuenta' },
  partidas: { table: 'partidas', pk: 'idpartida' },
  plantas: { table: 'plantas', pk: 'idplanta' },
};

function getResourceConfig(name) {
  return resources[name] || null;
}

// Cache to resolve logical table names (e.g., prefer 'usuarios' but fallback to 'users')
const tableResolutionCache = {};
async function resolveTableName(pool, table) {
  if (tableResolutionCache[table]) return tableResolutionCache[table];
  try {
    // If the preferred table exists, use it
    await pool.query(`DESCRIBE \`${table}\``);
    tableResolutionCache[table] = table;
    return table;
  } catch (e) {
    // fallback common mapping: usuarios -> users
    if (table === 'usuarios') {
      try {
        await pool.query('DESCRIBE `users`');
        tableResolutionCache[table] = 'users';
        return 'users';
      } catch (e2) {
        tableResolutionCache[table] = table; // leave as-is, will error later
        return table;
      }
    }
    tableResolutionCache[table] = table;
    return table;
  }
}

// List
router.get('/:resource', async (req, res) => {
  try {
  const cfg = getResourceConfig(req.params.resource);
    if (!cfg) return res.status(404).json({ message: 'Resource not found' });
    const pool = getPool();
  const table = await resolveTableName(pool, cfg.table);
  const [rows] = await pool.query(`SELECT * FROM \`${table}\` LIMIT 1000`);
    return res.json(rows);
  } catch (err) {
    console.error('List error', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// Get by id
router.get('/:resource/:id', async (req, res) => {
  try {
  const cfg = getResourceConfig(req.params.resource);
    if (!cfg) return res.status(404).json({ message: 'Resource not found' });
    const pool = getPool();
  const table = await resolveTableName(pool, cfg.table);
  const [rows] = await pool.execute(`SELECT * FROM \`${table}\` WHERE \`${cfg.pk}\` = ?`, [req.params.id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('Get error', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// Create
router.post('/:resource', async (req, res) => {
  try {
    const cfg = getResourceConfig(req.params.resource);
    if (!cfg) return res.status(404).json({ message: 'Resource not found' });
  const data = req.body || {};
  // ensure we have a DB pool early because we may need to resolve tipo -> tipo_id
  const pool = getPool();
    const table = await resolveTableName(pool, cfg.table);
    console.debug('CREATE request for resource', req.params.resource, 'table', table, 'payload:', Object.keys(data).length ? redact(data) : '(empty)');
    // helper to avoid accidentally logging passwords
    function redact(obj) {
      try {
        const c = { ...obj };
        ['password','password_hash','pass','clave'].forEach(k => { if (k in c) c[k] = '<<REDACTED>>'; });
        return c;
      } catch (e) { return obj; }
    }
    // If creating a user and a plain password was provided, keep it as plaintext in
    // the `password` column (user requested behavior). Do NOT hash.
    if (req.params.resource === 'usuarios' && data.password) {
      // Ensure we do not accidentally set password_hash column
      if (data.password_hash) delete data.password_hash;
      // password will be stored as provided in the `password` column
      // (INSECURE: storing plaintext passwords). This is intentional per request.
    }
    // If a `tipo` value was provided in the payload, resolve or create the corresponding tipo_id
    if (req.params.resource === 'usuarios' && data.tipo !== undefined) {
      try {
        let tipoVal = data.tipo;
        let tipoId = null;
        // try numeric code match by codigo
        if (typeof tipoVal === 'number' || /^\d+$/.test(String(tipoVal))) {
          const [r] = await pool.query('SELECT idtipo FROM tipo_usuario WHERE codigo = ? LIMIT 1', [String(tipoVal)]);
          if (r && r.length) tipoId = r[0].idtipo;
        }
        // try matching by codigo or nombre
        if (!tipoId) {
          const [r2] = await pool.query('SELECT idtipo FROM tipo_usuario WHERE codigo = ? OR nombre = ? LIMIT 1', [String(tipoVal), String(tipoVal)]);
          if (r2 && r2.length) tipoId = r2[0].idtipo;
        }
        // if still not found, do NOT create a new tipo automatically; return a clear 400 with allowed values
        if (!tipoId) {
          const [opts] = await pool.query('SELECT idtipo,codigo,nombre FROM tipo_usuario ORDER BY idtipo');
          // Log invalid attempt
          try {
            const fs = require('fs');
            const entry = { at: new Date().toISOString(), action: 'create_usuario_invalid_tipo', provided: tipoVal, ip: req.ip };
            fs.appendFileSync('invalid_tipo_attempts.log', JSON.stringify(entry) + '\n');
          } catch (e) {
            console.warn('Failed to write invalid tipo log', e && e.message);
          }
          return res.status(400).json({ message: 'Invalid tipo value', provided: tipoVal, allowed: opts });
        }
        data.tipo_id = tipoId;
      } catch (err) {
        console.error('Error resolving tipo -> tipo_id', err);
        return res.status(500).json({ message: 'Internal server error', error: 'Failed to resolve tipo' });
      }
      // remove legacy tipo field from payload to avoid DB errors if column is dropped
      delete data.tipo;
    }

  // Remove primary key if present
  delete data[cfg.pk];
    // Protect against unknown/extra fields: only allow columns that exist in the table
    const [colRows] = await pool.query(`DESCRIBE \`${table}\``);
  console.debug('Table columns for', table, ':', colRows.map(r => r.Field).join(', '));
    // If we hashed into password_hash but the table uses `password` instead,
    // move the hashed value to the existing column so the password is persisted.
    const tableCols = colRows.map(r => r.Field);
    if (data.password_hash && !tableCols.includes('password_hash') && tableCols.includes('password')) {
      // check current `password` column length; if too small for bcrypt hash, enlarge it
      try {
        const info = colRows.find(r => r.Field === 'password');
        if (info && info.Type && info.Type.toLowerCase().startsWith('varchar')) {
          const m = info.Type.match(/varchar\((\d+)\)/i);
          const current = m ? Number(m[1]) : null;
          if (current && current < 60) {
            // modify column to hold larger hash; preserve NULL/NOT NULL
            const nullSql = info.Null === 'YES' ? 'NULL' : 'NOT NULL';
            await pool.query(`ALTER TABLE \`${cfg.table}\` MODIFY \`password\` VARCHAR(255) ${nullSql}`);
            console.log(`Altered table ${cfg.table} password column to VARCHAR(255)`);
            // refresh colRows so later logic sees new type
            const refreshed = await pool.query(`DESCRIBE \`${cfg.table}\``);
            // replace colRows variable
            // eslint-disable-next-line prefer-destructuring
            // note: refreshed is [rows, fields]
            // we don't reassign colRows (const), but that's ok because we already used info; allowedCols will be fetched later
          }
        }
      } catch (e) {
        console.warn('Failed to expand password column:', e && e.message);
      }
      data.password = data.password_hash;
      delete data.password_hash;
    }
    const allowedCols = colRows.map(r => r.Field);
    const colInfo = Object.fromEntries(colRows.map(r => [r.Field, r]));
    const keys = Object.keys(data).filter(k => allowedCols.includes(k));
    if (keys.length === 0) return res.status(400).json({ message: 'No valid data provided' });

    // Check required NOT NULL columns (excluding auto_increment PK)
  const required = colRows.filter(r => r.Null === 'NO' && !r.Extra.includes('auto_increment') && r.Default == null).map(r => r.Field);
    const missing = [];
    for (const reqCol of required) {
      const info = colInfo[reqCol];
      const presentInPayload = keys.includes(reqCol) && data[reqCol] !== undefined && data[reqCol] !== null;
      let has = false;
      if (presentInPayload) {
        // For string-like columns (varchar/text/char) an empty string is a valid value for NOT NULL
        const t = (info.Type || '').toLowerCase();
        if (t.includes('char') || t.includes('text')) {
          has = true; // allow empty string
        } else {
          // for other types require non-empty (e.g., dates/numbers)
          has = String(data[reqCol]).trim() !== '';
        }
      }
      if (!has) missing.push(reqCol);
    }
    if (missing.length > 0) return res.status(400).json({ message: 'Missing required fields', missing });

    // Normalize values: convert empty strings to null for nullable cols; coerce dates and numbers
    const cols = [];
    const placeholders = [];
    const values = [];
    for (const k of keys) {
      let v = data[k];
      const info = colInfo[k];
      // normalize empty -> null for nullable
      if (v === '') {
        if (info.Null === 'YES') v = null;
      }
      // date normalization: accept several input forms and convert to YYYY-MM-DD
      if (info.Type && info.Type.toLowerCase().includes('date')) {
        // Date object -> ISO date
        if (v instanceof Date) {
          v = v.toISOString().slice(0, 10);
        } else {
          const s = String(v || '').trim();
          // dd/mm/yyyy -> yyyy-mm-dd
          const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          if (dmy) {
            v = `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
          } else {
            // ISO-like: 2027-01-01 or 2027-01-01T00:00:00Z -> keep YYYY-MM-DD
            const iso = s.match(/^(\d{4}-\d{2}-\d{2})(?:[T ].*)?$/);
            if (iso) v = iso[1];
          }
        }
      }
      // numeric coercion for int/float
      if (v !== null && v !== undefined && info.Type && (/int|float|double|decimal/.test(info.Type))) {
        if (v === '') v = null;
        else if (typeof v === 'string') {
          const num = Number(v);
          if (!Number.isNaN(num)) v = num;
        }
      }
      cols.push(`\`${k}\``);
      placeholders.push('?');
      values.push(v);
    }
  const insertSql = `INSERT INTO \`${table}\` (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`;
    console.debug('Executing SQL:', insertSql, 'VALUES:', values.map(v => (typeof v === 'string' && v.length > 100 ? String(v).slice(0,100)+'...' : v)));
    let result;
    try {
      [result] = await pool.execute(insertSql, values);
    } catch (sqlErr) {
      // Log helpful context to debug payload issues (e.g., data truncation)
      try {
        console.error('SQL error during INSERT for', cfg.table);
        console.error('SQL:', insertSql);
        console.error('VALUES (preview):', values.map(v => (typeof v === 'string' && v.length > 200 ? String(v).slice(0,200)+'...' : v)));
        console.error('error message:', sqlErr && (sqlErr.sqlMessage || sqlErr.message));
        console.error('payload (redacted):', redactLog(req.body || {}));
      } catch (le) {
        console.error('Error logging SQL failure context:', le && le.message);
      }
      // Return a 400 with DB error details when it's a data issue (e.g., truncated)
      if (sqlErr && /Data truncated/i.test(sqlErr.sqlMessage || sqlErr.message || '')) {
        return res.status(400).json({ message: 'Invalid data for one or more columns', error: sqlErr.sqlMessage || sqlErr.message });
      }
      return res.status(500).json({ message: 'Database error during insert', error: sqlErr.sqlMessage || sqlErr.message });
    }
    const insertId = result.insertId;
  const [rows] = await pool.execute(`SELECT * FROM \`${table}\` WHERE \`${cfg.pk}\` = ?`, [insertId]);
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create error', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// Update
router.put('/:resource/:id', async (req, res) => {
  try {
    const cfg = getResourceConfig(req.params.resource);
    if (!cfg) return res.status(404).json({ message: 'Resource not found' });
    const data = req.body || {};
    const pool = getPool();
    // resolve table name for this resource
    const table = await resolveTableName(pool, cfg.table);
    // If updating usuarios and a plain password was provided, keep it as plaintext
    // in the `password` column (do not hash). This matches the requested behavior.
    if (req.params.resource === 'usuarios' && data.password) {
      if (data.password_hash) delete data.password_hash;
      // password left as-is in data.password so UPDATE will persist it to `password` column
    }
    // If a `tipo` value was provided, resolve/create tipo_id
    if (req.params.resource === 'usuarios' && data.tipo !== undefined) {
      try {
        let tipoVal = data.tipo;
        let tipoId = null;
        if (typeof tipoVal === 'number' || /^\d+$/.test(String(tipoVal))) {
          const [r] = await pool.query('SELECT idtipo FROM tipo_usuario WHERE codigo = ? LIMIT 1', [String(tipoVal)]);
          if (r && r.length) tipoId = r[0].idtipo;
        }
        if (!tipoId) {
          const [r2] = await pool.query('SELECT idtipo FROM tipo_usuario WHERE codigo = ? OR nombre = ? LIMIT 1', [String(tipoVal), String(tipoVal)]);
          if (r2 && r2.length) tipoId = r2[0].idtipo;
        }
        if (!tipoId) {
          const [opts] = await pool.query('SELECT idtipo,codigo,nombre FROM tipo_usuario ORDER BY idtipo');
          // Log invalid attempt
          try {
            const fs = require('fs');
            const entry = { at: new Date().toISOString(), action: 'update_usuario_invalid_tipo', provided: tipoVal, ip: req.ip };
            fs.appendFileSync('invalid_tipo_attempts.log', JSON.stringify(entry) + '\n');
          } catch (e) {
            console.warn('Failed to write invalid tipo log', e && e.message);
          }
          return res.status(400).json({ message: 'Invalid tipo value', provided: tipoVal, allowed: opts });
        }
        data.tipo_id = tipoId;
      } catch (err) {
        console.error('Error resolving tipo -> tipo_id (update)', err);
        return res.status(500).json({ message: 'Internal server error', error: 'Failed to resolve tipo' });
      }
      delete data.tipo;
    }
    delete data[cfg.pk];
    // Filter to only existing table columns to avoid SQL errors
  const [colRows] = await pool.query(`DESCRIBE \`${table}\``);
    const allowedCols = colRows.map(r => r.Field);
    // If we hashed into password_hash but the usuarios table stores the password in `password`,
    // ensure the column is large enough and move the value so the UPDATE will persist the hashed password.
    if (data.password_hash && !allowedCols.includes('password_hash') && allowedCols.includes('password')) {
      try {
        const info = colRows.find(r => r.Field === 'password');
        if (info && info.Type && info.Type.toLowerCase().startsWith('varchar')) {
          const m = info.Type.match(/varchar\((\d+)\)/i);
          const current = m ? Number(m[1]) : null;
          if (current && current < 60) {
            const nullSql = info.Null === 'YES' ? 'NULL' : 'NOT NULL';
            await pool.query(`ALTER TABLE \`${cfg.table}\` MODIFY \`password\` VARCHAR(255) ${nullSql}`);
            console.log(`Altered table ${cfg.table} password column to VARCHAR(255)`);
          }
        }
      } catch (e) {
        console.warn('Failed to expand password column (update):', e && e.message);
      }
      data.password = data.password_hash;
      delete data.password_hash;
    }
    const colInfo = Object.fromEntries(colRows.map(r => [r.Field, r]));
    const keys = Object.keys(data).filter(k => allowedCols.includes(k));
    if (keys.length === 0) return res.status(400).json({ message: 'No valid data provided' });

    // For updates, normalize values similarly to create
    const assignments = [];
    const values = [];
    for (const k of keys) {
      let v = data[k];
      const info = colInfo[k];
      if (v === '') {
        if (info.Null === 'YES') v = null;
      }
      if (info.Type && info.Type.toLowerCase().includes('date')) {
        if (v instanceof Date) {
          v = v.toISOString().slice(0, 10);
        } else {
          const s = String(v || '').trim();
          const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          if (dmy) v = `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
          else {
            const iso = s.match(/^(\d{4}-\d{2}-\d{2})(?:[T ].*)?$/);
            if (iso) v = iso[1];
          }
        }
      }
      if (v !== null && v !== undefined && info.Type && (/int|float|double|decimal/.test(info.Type))) {
        if (v === '') v = null;
        else if (typeof v === 'string') {
          const num = Number(v);
          if (!Number.isNaN(num)) v = num;
        }
      }
      assignments.push(`\`${k}\` = ?`);
      values.push(v);
    }
    values.push(req.params.id);
    try {
      await pool.execute(`UPDATE \`${table}\` SET ${assignments.join(', ')} WHERE \`${cfg.pk}\` = ?`, values);
    } catch (sqlErr) {
      console.error('SQL error during UPDATE for', cfg.table, 'error:', sqlErr && (sqlErr.sqlMessage || sqlErr.message));
      console.error('payload (redacted):', redactLog(req.body || {}));
      if (sqlErr && /Data truncated/i.test(sqlErr.sqlMessage || sqlErr.message || '')) {
        return res.status(400).json({ message: 'Invalid data for one or more columns', error: sqlErr.sqlMessage || sqlErr.message });
      }
      return res.status(500).json({ message: 'Database error during update', error: sqlErr.sqlMessage || sqlErr.message });
    }
    const [rows] = await pool.execute(`SELECT * FROM \`${table}\` WHERE \`${cfg.pk}\` = ?`, [req.params.id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('Update error', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// Delete
router.delete('/:resource/:id', async (req, res) => {
  try {
  const cfg = getResourceConfig(req.params.resource);
    if (!cfg) return res.status(404).json({ message: 'Resource not found' });
    const pool = getPool();
  const table = await resolveTableName(pool, cfg.table);
  const [result] = await pool.execute(`DELETE FROM \`${table}\` WHERE \`${cfg.pk}\` = ?`, [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete error', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
