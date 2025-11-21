const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const DB_NAME = process.env.DB_NAME || 'AltexPPTO';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || 'root';
const DB_SSL_ENABLED = process.env.DB_SSL_ENABLED === 'true';
const DB_SSL_CA_PATH = process.env.DB_SSL_CA_PATH;

let pool;

async function ensureDatabaseAndTables() {
  try {
    // Configuración SSL para Azure MySQL
    const connectionConfig = {
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASS,
      multipleStatements: true
    };

    // Agregar configuración SSL si está habilitada (Azure)
    if (DB_SSL_ENABLED && DB_SSL_CA_PATH && fs.existsSync(DB_SSL_CA_PATH)) {
      connectionConfig.ssl = {
        ca: fs.readFileSync(DB_SSL_CA_PATH),
        rejectUnauthorized: true
      };
      console.log('SSL enabled for Azure MySQL connection');
    }

    // Create database if it doesn't exist (solo en desarrollo local)
    if (DB_HOST === 'localhost') {
      const conn = await mysql.createConnection(connectionConfig);
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
      await conn.end();
    }

    // Create pool connected to the database
    const poolConfig = {
      ...connectionConfig,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true
    };

    pool = mysql.createPool(poolConfig);

    // Test connection
    const connection = await pool.getConnection();
    console.log('Database connection successful');
    connection.release();

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

    console.log('Database and tables ensured successfully');
  } catch (error) {
    console.error('Database connection/setup error:', error);
    throw error;
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call ensureDatabaseAndTables() first.');
  }
  return pool;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

module.exports = { ensureDatabaseAndTables, getPool };