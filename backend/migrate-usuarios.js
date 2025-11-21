require('dotenv').config();
const bcrypt = require('bcryptjs');
const { ensureDatabaseAndTables, getPool } = require('./db');

async function migrate() {
  try {
    await ensureDatabaseAndTables();
    const pool = getPool();

    console.log('Reading rows from table `usuarios`...');
    // Attempt to read common columns: email, nombre/name, password
    const [rows] = await pool.query('SELECT * FROM usuarios');
    if (!rows || rows.length === 0) {
      console.log('No rows found in `usuarios`. Nothing to migrate.');
      return process.exit(0);
    }

    console.log(`Found ${rows.length} rows. Migrating...`);
    let migrated = 0;
    for (const r of rows) {
      const email = r.email || r.correo || r.user || r.usuario;
      const name = r.nombre || r.name || r.nombre_completo || r.nombre_usuario || r.fullname || null;
      const plainOrHash = r.password || r.password_hash || r.pass || r.clave || '';
      // try to carry forward any 'secret' field if present (accept varias formas de nombre)
      const secretVal = r.secret || r.secreto || null;
      if (!email) continue;

      let password_hash = plainOrHash;
      // Detect bcrypt hash pattern ($2a$ or $2b$ etc)
      if (!/^\$2[aby]\$/.test(String(plainOrHash))) {
        // assume plain text, hash it
        password_hash = await bcrypt.hash(String(plainOrHash), 10);
      }

      // Upsert into users table (create if not exists)
      try {
        await pool.execute(
          'INSERT INTO users (email, name, password_hash, secret) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), secret = VALUES(secret)',
          [email, name || null, password_hash, secretVal]
        );
        migrated++;
      } catch (e) {
        console.error('Failed to migrate user', email, e.message || e);
      }
    }

    console.log(`Migration completed. ${migrated} users migrated/updated.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
