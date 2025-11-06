const mysql = require('mysql2/promise');
(async ()=>{
  try{
    const DB_NAME = process.env.DB_NAME || 'AltexPPTO';
    const DB_HOST = process.env.DB_HOST || 'localhost';
    const DB_USER = process.env.DB_USER || 'root';
    const DB_PASS = process.env.DB_PASS !== undefined ? process.env.DB_PASS : 'root';
    const conn = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASS, database: DB_NAME });
    const ts = new Date().toISOString().replace(/[:.]/g,'').replace('T','_').slice(0,15);
    const backup = `usuarios_droptipo_backup_${ts}`;
    console.log('Creating backup table:', backup);
    await conn.query(`CREATE TABLE \`${backup}\` AS SELECT * FROM usuarios;`);
    // check if column exists
    const [cols] = await conn.query("SHOW COLUMNS FROM usuarios LIKE 'tipo'");
    if (cols && cols.length) {
      console.log('Dropping column `tipo` from usuarios');
      await conn.query('ALTER TABLE usuarios DROP COLUMN tipo');
      console.log('Column dropped');
    } else {
      console.log('Column `tipo` does not exist, nothing to do');
    }
    await conn.end();
    process.exit(0);
  }catch(err){
    console.error('Error:', err && err.message);
    process.exit(1);
  }
})();
