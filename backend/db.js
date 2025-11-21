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

  // Create users table if it doesn't exist
  const createUsers = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      password_hash VARCHAR(255) NOT NULL,
      secret VARCHAR(30) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(createUsers);

  // Insert a default user if table empty (email: ana.martinez@correo.com, password: 1234)
  const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM users');
  if (rows && rows[0] && rows[0].cnt === 0) {
    const defaultEmail = 'ana.martinez@correo.com';
    const defaultName = 'Ana Martinez';
    const defaultPassword = '1234';
    const hash = await bcrypt.hash(defaultPassword, 10);
    await pool.query('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)', [defaultEmail, defaultName, hash]);
    console.log(`Inserted default user ${defaultEmail} with password ${defaultPassword}`);
  }
}

function getPool() {
  if (!pool) throw new Error('Pool not initialized. Call ensureDatabaseAndTables first.');
  return pool;
}

module.exports = { ensureDatabaseAndTables, getPool };
