const mysql = require('mysql2/promise');
(async ()=>{
  try{
    const DB_NAME = process.env.DB_NAME || 'AltexPPTO';
    const DB_HOST = process.env.DB_HOST || 'localhost';
    const DB_USER = process.env.DB_USER || 'root';
    const DB_PASS = process.env.DB_PASS !== undefined ? process.env.DB_PASS : 'root';
    const conn = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASS, database: DB_NAME });
  // `tipo` column may have been dropped; select current columns
  const [rows] = await conn.query(`SELECT u.idusuario, u.nombre, u.tipo_id, t.nombre as tipo_nombre FROM usuarios u LEFT JOIN tipo_usuario t ON t.idtipo = u.tipo_id LIMIT 50`);
    console.log(JSON.stringify(rows, null, 2));
    await conn.end();
  }catch(err){
    console.error('Error:', err && err.message);
    process.exit(1);
  }
})();
