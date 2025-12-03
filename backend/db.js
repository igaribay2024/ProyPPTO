const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_NAME = process.env.DB_NAME || 'AltexPPTO';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || 'root';

let pool;

async function ensureDatabaseAndTables() {
  // Create database if it doesn't exist
  const conn = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASS, multipleStatements: true });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
  await conn.end();

  // Create pool connected to the database
  pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // Create usuarios table if it doesn't exist (matching Azure structure)
  const createUsuarios = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      nombre VARCHAR(255),
      password VARCHAR(255) NOT NULL,
      tipo_usuario VARCHAR(50) DEFAULT 'usuario',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(createUsuarios);

  // Create gastos table if it doesn't exist
  const createGastos = `
    CREATE TABLE IF NOT EXISTS gastos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      monto DECIMAL(10,2) NOT NULL,
      descripcion VARCHAR(255),
      categoria VARCHAR(100),
      fecha DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );
  `;
  await pool.query(createGastos);

  // Create presupuestos table if it doesn't exist
  const createPresupuestos = `
    CREATE TABLE IF NOT EXISTS presupuestos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      nombre VARCHAR(255) NOT NULL,
      monto_limite DECIMAL(10,2) NOT NULL,
      categoria VARCHAR(100),
      periodo VARCHAR(50),
      descripcion TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );
  `;
  await pool.query(createPresupuestos);

  // Insert a default user if table empty (email: ana.martinez@correo.com, password: pass234)
  const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM usuarios');
  if (rows && rows[0] && rows[0].cnt === 0) {
    const defaultEmail = 'ana.martinez@correo.com';
    const defaultName = 'Ana Martínez';
    const defaultPassword = 'pass234';
    await pool.query('INSERT INTO usuarios (email, nombre, password) VALUES (?, ?, ?)', [defaultEmail, defaultName, defaultPassword]);
    console.log(`Inserted default user ${defaultEmail} with password ${defaultPassword}`);
  }
}

function getPool() {
  if (!pool) throw new Error('Pool not initialized. Call ensureDatabaseAndTables first.');
  return pool;
}

module.exports = { ensureDatabaseAndTables, getPool };
