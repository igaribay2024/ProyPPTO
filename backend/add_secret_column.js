require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'AltexPPTO';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS !== undefined ? process.env.DB_PASS : 'root';

async function ensureColumn(pool, table, column, definition) {
  try {
    const [cols] = await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
    if (cols && cols.length > 0) {
      console.log(`Table ${table} already has column ${column}`);
      return { table, column, changed: false };
    }
    console.log(`Adding column ${column} to table ${table}...`);
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
    console.log(`Added ${column} to ${table}`);
    return { table, column, changed: true };
  } catch (err) {
    console.error(`Error ensuring column ${column} on ${table}:`, err && err.message ? err.message : err);
    return { table, column, changed: false, error: err };
  }
}

async function main() {
  let conn;
  try {
    conn = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASS, multipleStatements: true });
    // ensure database exists
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    await conn.end();

    const pool = mysql.createPool({ host: DB_HOST, user: DB_USER, password: DB_PASS, database: DB_NAME, connectionLimit: 5 });

    // Only attempt when table exists; if not, warn.
    const tablesToCheck = ['users', 'usuarios'];
    for (const t of tablesToCheck) {
      try {
        const [rows] = await pool.query('SHOW TABLES LIKE ?', [t]);
        if (!rows || rows.length === 0) {
          console.warn(`Table ${t} does not exist in database ${DB_NAME}. Skipping.`);
          continue;
        }
      } catch (e) {
        console.warn(`Could not check existence of table ${t}:`, e && e.message ? e.message : e);
        continue;
      }
      await ensureColumn(pool, t, 'secret', "secret VARCHAR(30) NULL");
    }

    await pool.end();
    console.log('Migration script finished.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err && err.message ? err.message : err);
    if (conn) try { await conn.end(); } catch(e) {}
    process.exit(2);
  }
}

main();
