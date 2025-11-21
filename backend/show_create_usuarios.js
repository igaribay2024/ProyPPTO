const mysql = require('mysql2/promise');

(async ()=>{
  try{
    const DB_NAME = process.env.DB_NAME || 'AltexPPTO';
    const DB_HOST = process.env.DB_HOST || 'localhost';
    const DB_USER = process.env.DB_USER || 'root';
    const DB_PASS = process.env.DB_PASS || '';

    const conn = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASS, database: DB_NAME });
    const [rows] = await conn.query("SHOW CREATE TABLE usuarios");
    console.log(JSON.stringify(rows, null, 2));
    await conn.end();
  }catch(err){
    console.error('Error:', err && err.message);
    process.exit(1);
  }
})();
