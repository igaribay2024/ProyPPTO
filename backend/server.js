require('dotenv').config();

// Debug: mostrar variables de entorno relevantes al iniciar para facilitar diagnósticos
console.log('Loaded environment variables:', {
  PORT: process.env.PORT,
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_NAME: process.env.DB_NAME,
  NODE_ENV: process.env.NODE_ENV,
  DB_SSL_ENABLED: process.env.DB_SSL_ENABLED,
});

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Detectar entorno y seleccionar configuración de DB apropiada
let dbModule;
if (process.env.RAILWAY_ENVIRONMENT) {
  // Entorno Railway
  dbModule = './db-railway';
} else if (process.env.NODE_ENV === 'production') {
  // Entorno Azure
  dbModule = './db-azure';
} else {
  // Entorno local/desarrollo
  dbModule = './db';
}

console.log(`🔧 Using database module: ${dbModule}`);
const { ensureDatabaseAndTables, getPool } = require(dbModule);

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

const app = express();

// CORS configuration for Azure
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Debug middleware: log parsed request body (do not re-read the raw stream)
// Reading the raw stream here may conflict with body parsers and lead to empty req.body.
app.use('/api', (req, res, next) => {
  try {
    if (req.method === 'POST') {
      try {
        if (req.body && Object.keys(req.body).length) {
          console.debug('[raw-body-debug] parsed body for', req.method, req.originalUrl, JSON.stringify(req.body).slice(0, 1000));
        } else {
          console.debug('[raw-body-debug] parsed body empty for', req.method, req.originalUrl);
        }
      } catch (e) {
        console.debug('[raw-body-debug] could not stringify body for', req.method, req.originalUrl);
      }
    }
  } catch (e) { /* ignore */ }
  next();
});
// cache which password column exists in users table: 'password' (plaintext) or 'password_hash' (hashed)
let usersPasswordColumn = null; // 'password' | 'password_hash'
// cache common users field names mapping
let usersFields = null; // { id: 'idusuario'|'id', email: 'email', name: 'nombre'|'name', created_at: 'created_at'|null }
// cache detected users table name ('usuarios' or 'users')
let usersTableName = null;

async function detectUsersPasswordColumn() {
  try {
    const pool = getPool();
    // ensure we have the correct table name
    if (!usersTableName) await detectUsersTable();
    const [cols] = await pool.query(`DESCRIBE \`${usersTableName}\``);
    const fields = (cols || []).map(c => c.Field);
    if (fields.includes('password')) usersPasswordColumn = 'password';
    else if (fields.includes('password_hash')) usersPasswordColumn = 'password_hash';
    else usersPasswordColumn = null;
    console.log('Detected users password column:', usersPasswordColumn);
  } catch (err) {
    console.warn('Could not detect users table columns yet:', err && err.message);
    usersPasswordColumn = null;
  }
}

async function detectUsersColumns() {
  try {
    const pool = getPool();
    if (!usersTableName) await detectUsersTable();
    const [cols] = await pool.query(`DESCRIBE \`${usersTableName}\``);
    const fields = (cols || []).map(c => c.Field);
    const id = fields.find(f => /idusuario/i.test(f)) || fields.find(f => /^id$/i.test(f)) || fields[0];
    const email = fields.find(f => /email|correo/i.test(f)) || null;
    const name = fields.find(f => /nombre|name/i.test(f)) || null;
    const created_at = fields.find(f => /created_at|created/i.test(f)) || null;
    usersFields = { id, email, name, created_at };
    console.log('Detected users fields mapping:', usersFields);
    return usersFields;
  } catch (err) {
    console.warn('Could not detect users table columns yet:', err && err.message);
    usersFields = null;
    return null;
  }
}

async function detectUsersTable() {
  try {
    const pool = getPool();
    // Prefer Spanish table 'usuarios' if it exists, otherwise fall back to 'users'
    try {
      await pool.query('DESCRIBE `usuarios`');
      usersTableName = 'usuarios';
    } catch (e) {
      // try english table
      try {
        await pool.query('DESCRIBE `users`');
        usersTableName = 'users';
      } catch (e2) {
        usersTableName = 'users'; // default, may fail later
      }
    }
    console.log('Detected users table name:', usersTableName);
    return usersTableName;
  } catch (err) {
    console.warn('Could not detect users table name yet:', err && err.message);
    usersTableName = 'users';
    return usersTableName;
  }
}


app.post('/api/login', async (req, res) => {
  try {
  const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'email and password required' });
    const pool = getPool();
    console.log(`Login attempt for email='${email}'`);
    // ensure we know which table and which fields to use
    if (!usersTableName) await detectUsersTable();
    if (!usersFields) await detectUsersColumns();
    if (!usersPasswordColumn) await detectUsersPasswordColumn();

    // build SELECT parts based on detected fields
    const selectParts = [];
    if (usersFields && usersFields.id) selectParts.push(`\`${usersFields.id}\` as id`);
    if (usersFields && usersFields.email) selectParts.push(`\`${usersFields.email}\` as email`);
    if (usersFields && usersFields.name) selectParts.push(`\`${usersFields.name}\` as name`);
    // include the password column we will check
    if (usersPasswordColumn === 'password') selectParts.push('`password`');
    else selectParts.push('`password_hash`');

    const selectSql = selectParts.join(', ');
    const emailField = (usersFields && usersFields.email) ? `\`${usersFields.email}\`` : 'email';
    const [rows] = await pool.execute(`SELECT ${selectSql} FROM \`${usersTableName}\` WHERE ${emailField} = ?`, [email]);
    const user = rows && rows[0];
    if (!user) {
      console.log(`Login failed: user not found for email='${email}'`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (usersPasswordColumn === 'password') {
      if (String(password) !== String(user.password)) {
        console.log(`Login failed: password mismatch for email='${email}'`);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    } else {
      const match = await bcrypt.compare(password, user.password_hash || '');
      if (!match) {
        console.log(`Login failed: password mismatch for email='${email}'`);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    }

    console.log(`Login success for email='${email}' (id=${user.id})`);
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// Debug route (development only): list users (id, email, name)
app.get('/api/debug/users', async (req, res) => {
  try {
    const pool = getPool();
    // Ensure we know the users table and fields mapping
    if (!usersTableName) await detectUsersTable();
    if (!usersFields) await detectUsersColumns();
    // If we have a good mapping for email and name, select specific columns and alias them
    if (usersFields && usersFields.email && usersFields.name) {
      const sel = [`\`${usersFields.id}\` as id`, `\`${usersFields.email}\` as email`, `\`${usersFields.name}\` as name`];
      if (usersFields.created_at) sel.push(`\`${usersFields.created_at}\` as created_at`);
      console.debug('Debug users select:', sel.join(', '));
      const [rows] = await pool.query(`SELECT ${sel.join(', ')} FROM \`${usersTableName}\` LIMIT 200`);
      return res.json(rows);
    }
  // Fallback: select all non-password columns
  if (!usersTableName) await detectUsersTable();
  const [cols] = await pool.query(`DESCRIBE \`${usersTableName}\``);
  const safeCols = (cols || []).map(c => c.Field).filter(f => !/password(_hash)?/i.test(f)).map(f => '`' + f + '`');
  const select = safeCols.length ? safeCols.join(', ') : '*';
  console.debug('Debug users fallback select:', select);
  const [rows] = await pool.query(`SELECT ${select} FROM \`${usersTableName}\` LIMIT 200`);
  return res.json(rows);
  } catch (err) {
    console.error('Debug users error:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// Debug route to reset a user's password (development only)
app.post('/api/debug/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body || {};
    if (!email || !newPassword) return res.status(400).json({ message: 'email and newPassword required' });

    const pool = getPool();
    // detect which password column exists and which table/fields to use
    if (!usersTableName) await detectUsersTable();
    if (!usersFields) await detectUsersColumns();
    if (!usersPasswordColumn) await detectUsersPasswordColumn();
    const emailField = (usersFields && usersFields.email) ? `\`${usersFields.email}\`` : 'email';
    if (usersPasswordColumn === 'password') {
      console.debug('Reset password: writing plaintext to `password` column for', email);
      const [result] = await pool.execute(`UPDATE \`${usersTableName}\` SET password = ? WHERE ${emailField} = ?`, [newPassword, email]);
      if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
      return res.json({ message: 'Password reset' });
    }
    if (usersPasswordColumn === 'password_hash') {
      const hash = await bcrypt.hash(String(newPassword), 10);
      console.debug('Reset password: writing bcrypt hash to `password_hash` for', email);
      const [result] = await pool.execute(`UPDATE \`${usersTableName}\` SET password_hash = ? WHERE ${emailField} = ?`, [hash, email]);
      if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
      return res.json({ message: 'Password reset' });
    }
    // If unknown, return an error (avoid accidentally creating new columns)
    console.warn('Reset password: unknown users password column');
    return res.status(500).json({ message: 'Users password column not detected' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// Endpoint para registrar usuarios (simple, para desarrollo)
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'email and password required' });

    const pool = getPool();
    // detect table/fields and verify user existence
    if (!usersTableName) await detectUsersTable();
    if (!usersFields) await detectUsersColumns();
    if (!usersPasswordColumn) await detectUsersPasswordColumn();
    const emailField = (usersFields && usersFields.email) ? `\`${usersFields.email}\`` : 'email';
    const [existing] = await pool.execute(`SELECT * FROM \`${usersTableName}\` WHERE ${emailField} = ? LIMIT 1`, [email]);
    if (existing && existing.length > 0) return res.status(409).json({ message: 'User already exists' });

    if (usersPasswordColumn === 'password') {
      console.debug('Register: inserting plaintext password into `password` column for', email);
      const [result] = await pool.execute(`INSERT INTO \`${usersTableName}\` (${emailField.replace(/`/g,'')}, name, password) VALUES (?, ?, ?)`, [email, name || null, password]);
      const userId = result.insertId;
      return res.status(201).json({ id: userId, email, name: name || null });
    }
    if (usersPasswordColumn === 'password_hash') {
      console.debug('Register: hashing password into `password_hash` for', email);
      const hash = await bcrypt.hash(String(password), 10);
      const [result] = await pool.execute(`INSERT INTO \`${usersTableName}\` (email, name, password_hash) VALUES (?, ?, ?)`, [email, name || null, hash]);
      const userId = result.insertId;
      return res.status(201).json({ id: userId, email, name: name || null });
    }
    console.warn('Register: unknown users password column');
    return res.status(500).json({ message: 'Users password column not detected' });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Password reset using email + secret (two-step friendly endpoint)
// Behavior:
// - POST { email, secret } => verifies that a user with that email has the same secret. Returns { verified: true } on success or 401 on failure.
// - POST { email, secret, newPassword } => verifies and if ok updates the password (plaintext or bcrypt depending on schema) and returns success or error.
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, secret, newPassword } = req.body || {};
    if (!email || !secret) return res.status(400).json({ message: 'email and secret required' });

    const pool = getPool();
    if (!usersTableName) await detectUsersTable();
    if (!usersFields) await detectUsersColumns();
    if (!usersPasswordColumn) await detectUsersPasswordColumn();

  const emailField = (usersFields && usersFields.email) ? `\`${usersFields.email}\`` : 'email';
  const idField = (usersFields && usersFields.id) ? `\`${usersFields.id}\`` : '`id`';
  const passwordSelect = usersPasswordColumn === 'password' ? '`password`' : usersPasswordColumn === 'password_hash' ? '`password_hash`' : '';

  // Detect whether columns `secret` and/or `secreto` actually exist to avoid SQL errors
  let secretColumn = null; // will be one of: 'secret', 'secreto', or null
  try {
    const [s1] = await pool.query("SHOW COLUMNS FROM `" + usersTableName + "` LIKE 'secret'");
    if (s1 && s1.length) secretColumn = 'secret';
    const [s2] = await pool.query("SHOW COLUMNS FROM `" + usersTableName + "` LIKE 'secreto'");
    if (!secretColumn && s2 && s2.length) secretColumn = 'secreto';
  } catch (e) {
    // ignore
  }

  // Build select SQL safely based on which secret column exists
  let secretSelectSql = 'NULL as secret';
  if (secretColumn === 'secret') secretSelectSql = '`secret` as secret';
  else if (secretColumn === 'secreto') secretSelectSql = '`secreto` as secret';

  // If both exist, prefer COALESCE to pick non-null
  try {
    const [both] = await pool.query("SHOW COLUMNS FROM `" + usersTableName + "` LIKE 'secret'");
    const [both2] = await pool.query("SHOW COLUMNS FROM `" + usersTableName + "` LIKE 'secreto'");
    if (both && both.length && both2 && both2.length) {
      secretSelectSql = 'COALESCE(`secret`,`secreto`) as secret';
    }
  } catch (e) {
    // ignore
  }

  const selectSql = `${idField} as id, ${emailField} as email, ${secretSelectSql}` + (passwordSelect ? `, ${passwordSelect}` : '');

  // Debug: log what's being queried to help troubleshoot mismatches (redact sensitive values)
  try {
    const redact = (s) => { if (s == null) return ''; const t = String(s); return t.length <= 2 ? t.replace(/./g, '*') : (t.slice(0,2) + '***'); };
    console.debug('[reset-password] usersTableName=', usersTableName, 'emailField=', emailField, 'passwordColumn=', usersPasswordColumn);
    console.debug('[reset-password] incoming email=', email, 'secret=', redact(secret));
  } catch (e) {}

  const [rows] = await pool.query(`SELECT ${selectSql} FROM \`${usersTableName}\` WHERE ${emailField} = ? LIMIT 1`, [email]);
  const user = rows && rows[0];
  try {
    const redactRow = (r) => {
      if (!r) return null;
      const clone = { ...r };
      if ('password' in clone) clone.password = '<<REDACTED>>';
      if ('password_hash' in clone) clone.password_hash = '<<REDACTED>>';
      if ('secret' in clone && clone.secret != null) clone.secret = (String(clone.secret).slice(0,2) + '***');
      if ('secreto' in clone && clone.secreto != null) clone.secreto = (String(clone.secreto).slice(0,2) + '***');
      return clone;
    };
    console.debug('[reset-password] query returned rows=', rows && rows.length || 0, 'row=', redactRow(user));
  } catch (e) {}
    if (!user) {
      // don't reveal whether email exists; treat as not matching
      return res.status(401).json({ message: 'Invalid email or secret' });
    }

    // Normalize and trim secrets to avoid mismatches from whitespace or unicode variations
    const storedSecret = user && user.secret != null ? String(user.secret).normalize('NFKC').trim() : '';
    const incomingSecret = String(secret).normalize('NFKC').trim();
    if (incomingSecret !== storedSecret) {
      return res.status(401).json({ message: 'Invalid email or secret' });
    }

    // If no newPassword provided, just verify
    if (!newPassword) return res.json({ verified: true });

    // Update password according to detected schema
    if (usersPasswordColumn === 'password') {
      const [result] = await pool.execute(`UPDATE \`${usersTableName}\` SET password = ? WHERE ${emailField} = ?`, [newPassword, email]);
      if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
      return res.json({ message: 'Password reset' });
    }
    if (usersPasswordColumn === 'password_hash') {
      const hash = await bcrypt.hash(String(newPassword), 10);
      const [result] = await pool.execute(`UPDATE \`${usersTableName}\` SET password_hash = ? WHERE ${emailField} = ?`, [hash, email]);
      if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
      return res.json({ message: 'Password reset' });
    }

    return res.status(500).json({ message: 'Users password column not detected' });
  } catch (err) {
    console.error('Reset-password endpoint error:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// ADMIN: run migration to add tipo_usuario lookup and tipo_id FK
// Development-only endpoint to migrate usuarios.tipo -> usuarios.tipo_id
app.post('/api/admin/migrate-tipo', async (req, res) => {
  try {
    const pool = getPool();
    // create timestamped backup
    const ts = new Date().toISOString().replace(/[:.]/g,'').replace('T','_').slice(0,15);
    const backupName = `usuarios_backup_${ts}`;
    await pool.query(`CREATE TABLE \`${backupName}\` AS SELECT * FROM usuarios;`);

    // create lookup
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tipo_usuario (
        idtipo INT AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(20) NOT NULL UNIQUE,
        nombre VARCHAR(60) NOT NULL
      );
    `);

    // insert codes 1->Interno, 2->Externo (ignore duplicates)
    await pool.query('INSERT IGNORE INTO tipo_usuario (codigo,nombre) VALUES (?,?),(?,?)', ['1','Interno','2','Externo']);

    // add tipo_id if not exists
    const [cols] = await pool.query("SHOW COLUMNS FROM usuarios LIKE 'tipo_id'");
    if (!cols || cols.length === 0) {
      await pool.query('ALTER TABLE usuarios ADD COLUMN tipo_id INT NULL;');
    }

    // add secret column to usuarios if not exists
    try {
      const [secretCol] = await pool.query("SHOW COLUMNS FROM usuarios LIKE 'secret'");
      if (!secretCol || secretCol.length === 0) {
        await pool.query("ALTER TABLE usuarios ADD COLUMN secret VARCHAR(30) NULL;");
      }
    } catch (e) {
      // best-effort: log and continue
      console.warn('Could not ensure usuarios.secret column:', e && e.message);
    }

    // populate tipo_id from codigo or nombre
    await pool.query(`UPDATE usuarios u JOIN tipo_usuario t ON t.codigo = u.tipo SET u.tipo_id = t.idtipo WHERE u.tipo_id IS NULL;`);
    await pool.query(`UPDATE usuarios u JOIN tipo_usuario t ON t.nombre = u.tipo SET u.tipo_id = t.idtipo WHERE u.tipo_id IS NULL;`);
    await pool.query(`UPDATE usuarios u JOIN tipo_usuario t ON t.codigo = u.tipo SET u.tipo_id = t.idtipo WHERE u.tipo_id IS NULL AND u.tipo IN ('1','2');`);

    // add FK if not exists
    const [fks] = await pool.query(`SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'tipo_id' AND REFERENCED_TABLE_NAME = 'tipo_usuario'`, [process.env.DB_NAME]);
    if (!fks || fks.length === 0) {
      await pool.query(`ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_tipo FOREIGN KEY (tipo_id) REFERENCES tipo_usuario(idtipo);`);
    }

    return res.json({ message: 'Migration completed', backup: backupName });
  } catch (err) {
    console.error('Migration error (admin endpoint):', err);
    return res.status(500).json({ message: 'Migration failed', error: err.message });
  }
});

// CRUD router for domain resources (presupuestos, gastos, usuarios, etc.)
const crudRouter = require('./routes/crud');
// Metadata endpoint: return table column info (DESCRIBE) for a resource
// This helps the frontend render forms dynamically and avoid sending unknown columns.
const resourceToTable = {
  usuarios: 'usuarios',
  presupuestos: 'presupuestos',
  gastos: 'gastos',
  conceptos: 'conceptos',
  cuentas: 'cuentas',
  partidas: 'partidas',
  plantas: 'plantas',
};

app.get('/api/meta/:resource', async (req, res) => {
  try {
    const resName = req.params.resource;
    const table = resourceToTable[resName];
    if (!table) return res.status(404).json({ message: 'Resource not found' });
    const pool = getPool();
    const [rows] = await pool.query(`DESCRIBE \`${table}\``);
    return res.json(rows);
  } catch (err) {
    console.error('Meta error', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// Mount the generic CRUD router after specific routes
app.use('/api', crudRouter);

// helper to redact passwords from debug logs
function redactPasswords(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  try {
    const clone = Array.isArray(obj) ? obj.map(o => redactPasswords(o)) : { ...obj };
    ['password', 'password_hash', 'pass', 'clave'].forEach(k => {
      if (k in clone) clone[k] = '<<REDACTED>>';
    });
    return clone;
  } catch (e) {
    return obj;
  }
}

// Error-handling middleware: log requests and stack for 500 errors (development)
app.use((err, req, res, next) => {
  try {
    console.error('Unhandled error for request', req.method, req.originalUrl, 'body=', redactPasswords(req.body), err && err.stack ? err.stack : err);
  } catch (e) {
    console.error('Error while logging error:', e && e.message);
  }
  // let default handlers run
  res.status(500).json({ message: 'Internal server error', error: err && err.message });
});

// Public route: list tipo_usuario entries (lookup table for usuarios.tipo_id)
app.get('/api/tipo_usuario', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT idtipo, codigo, nombre FROM tipo_usuario ORDER BY idtipo');
    return res.json(rows);
  } catch (err) {
    console.error('tipo_usuario list error', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// Debug endpoint: aggregated totals for the current month (partidas and gastos) per account
// Useful to compare frontend aggregations with DB state. Development only.
app.get('/api/debug/agg-mes', async (req, res) => {
  try {
    const pool = getPool();
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // helper to resolve a table name (best-effort)
    async function resolveTable(pool, preferred) {
      try {
        await pool.query(`DESCRIBE \`${preferred}\``);
        return preferred;
      } catch (e) {
        // if preferred doesn't exist, just return preferred and let SELECT fail upstream
        return preferred;
      }
    }

    // fetch all rows from a table and aggregate in JS to comfortably handle varied field names
    async function aggregateFor(tablePref, candidateDateFields = []) {
      const table = await resolveTable(pool, tablePref);
      const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
      const byCuenta = Object.create(null);
      const cuentaLabels = Object.create(null);
      const count = rows.length || 0;

      for (const r of rows || []) {
        // infer month/year
        let month = null;
        let year = null;
        const rawMonth = r.mes ?? r.month ?? r.mes_partida ?? r.mes_gasto;
        const rawYear = r.anno ?? r.year ?? r.anio;
        const pm = rawMonth === undefined || rawMonth === null ? null : Number(rawMonth);
        const py = rawYear === undefined || rawYear === null ? null : Number(rawYear);
        if (Number.isFinite(pm)) {
          if (pm >= 1 && pm <= 12) { month = pm; year = Number.isFinite(py) ? py : currentYear; }
          else if (pm >= 0 && pm <= 11) { month = pm + 1; year = Number.isFinite(py) ? py : currentYear; }
        }
        if (!month) {
          for (const f of candidateDateFields) {
            const ds = r[f];
            if (!ds) continue;
            const d = new Date(ds);
            if (!Number.isNaN(d.getTime())) { month = d.getMonth() + 1; year = d.getFullYear(); break; }
          }
        }
        if (!month) {
          const cand = r.fecha_ini ?? r.fecha_partida ?? r.fecha_gasto ?? r.fecha;
          if (cand) {
            const d = new Date(cand);
            if (!Number.isNaN(d.getTime())) { month = d.getMonth() + 1; year = d.getFullYear(); }
          }
        }
        if (month !== currentMonth || (year || currentYear) !== currentYear) continue;

        // account id heuristics
        const id = String(r.idcuenta ?? r.id_cuenta ?? r.cuenta_id ?? r.idCuenta ?? r.cuenta ?? 'sin_cuenta');
        const label = r.nombre_cuenta ?? r.nombre ?? r.descripcion ?? null;
        if (label) cuentaLabels[id] = label;

        const val = Number(r.monto_base ?? r.monto ?? r.importe ?? r.amount ?? r.costo ?? 0) || 0;
        byCuenta[id] = (byCuenta[id] || 0) + val;
      }

      return { table: tablePref, count, byCuenta, cuentaLabels };
    }

    const partidasAgg = await aggregateFor('partidas', ['fecha_ini','fecha_partida']);
    const gastosAgg = await aggregateFor('gastos', ['fecha','fecha_gasto']);

    // Build unified account map
    const cuentaMap = { ...partidasAgg.cuentaLabels, ...gastosAgg.cuentaLabels };

    return res.json({ month: currentMonth, year: currentYear, partidas: partidasAgg, gastos: gastosAgg, cuentaMap });
  } catch (err) {
    console.error('agg-mes debug error', err);
    return res.status(500).json({ message: 'Debug aggregation failed', error: err && err.message });
  }
});

// Protected: create a new tipo_usuario (admin only)
app.post('/api/tipo_usuario', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
    const token = auth.slice(7);
    let payload;
    try { payload = jwt.verify(token, JWT_SECRET); } catch (e) { return res.status(401).json({ message: 'Invalid token' }); }
    const userId = payload && payload.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const pool = getPool();
    const [usr] = await pool.query('SELECT idusuario, rol FROM usuarios WHERE idusuario = ? LIMIT 1', [userId]);
    if (!usr || usr.length === 0) return res.status(403).json({ message: 'Forbidden' });
    const role = usr[0].rol || '';
    const ok = String(role).toLowerCase().includes('admin') || String(role).toLowerCase().includes('gerente');
    if (!ok) return res.status(403).json({ message: 'Insufficient privileges' });

    const { codigo, nombre } = req.body || {};
    if (!codigo || !nombre) return res.status(400).json({ message: 'codigo and nombre required' });
    const [existing] = await pool.query('SELECT idtipo FROM tipo_usuario WHERE codigo = ? OR nombre = ? LIMIT 1', [String(codigo), String(nombre)]);
    if (existing && existing.length) return res.status(409).json({ message: 'Tipo already exists', existing: existing[0] });
    const [ins] = await pool.query('INSERT INTO tipo_usuario (codigo,nombre) VALUES (?,?)', [String(codigo), String(nombre)]);
    const [row] = await pool.query('SELECT idtipo,codigo,nombre FROM tipo_usuario WHERE idtipo = ?', [ins.insertId]);
    return res.status(201).json(row[0]);
  } catch (err) {
    console.error('tipo_usuario create error', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// Inicializar DB y luego arrancar el servidor. Manejar errores comunes (p.ej. EADDRINUSE)
(async () => {
  try {
    await ensureDatabaseAndTables();
    // detect which users table/columns/password column exists after tables are ensured
    await detectUsersTable();
    await detectUsersColumns();
    await detectUsersPasswordColumn();

    const server = app.listen(PORT, () => {
      console.log(`Backend listening on http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the process using that port or set PORT env to a free port.`);
        console.error('Detailed error:', err);
        process.exit(1);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
  } catch (err) {
    console.error('Failed to initialize database/tables:', err);
    process.exit(1);
  }
})();
