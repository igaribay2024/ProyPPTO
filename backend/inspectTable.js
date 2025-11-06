const { ensureDatabaseAndTables, getPool } = require('./db');

const tables = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['presupuestos'];

(async () => {
  try {
    await ensureDatabaseAndTables();
    const pool = getPool();
    for (const t of tables) {
      console.log('DESCRIBE', t + ':');
      const [rows] = await pool.query('DESCRIBE `'+t+'`');
      rows.forEach(r => console.log(r.Field, r.Type, r.Null, 'Default=', r.Default, 'Extra=', r.Extra));
      console.log('');
    }
    process.exit(0);
  } catch (err) {
    console.error('Failed to describe table:', err.message || err);
    process.exit(2);
  }
})();
