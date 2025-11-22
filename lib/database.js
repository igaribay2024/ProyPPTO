import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'mysql-presupuesto.mysql.database.azure.com',
  user: process.env.DB_USER || 'rootppto',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'presupuesto_db',
  port: parseInt(process.env.DB_PORT) || 3306,
  ssl: process.env.DB_SSL_ENABLED === 'true' ? {
    rejectUnauthorized: false
  } : false,
  connectTimeout: 20000,
  acquireTimeout: 20000,
  connectionLimit: 1 // Vercel functions work better with single connections
};

// Cache para evitar múltiples conexiones
let cachedConnection = null;

export async function getConnection() {
  if (cachedConnection && cachedConnection._closing === false) {
    return cachedConnection;
  }

  try {
    cachedConnection = await mysql.createConnection(dbConfig);
    console.log('✅ Vercel - Conexión exitosa a MySQL Azure');
    return cachedConnection;
  } catch (error) {
    console.error('❌ Vercel - Error conectando a MySQL Azure:', error.message);
    throw error;
  }
}

// Utility function to close connection
export async function closeConnection() {
  if (cachedConnection) {
    await cachedConnection.end();
    cachedConnection = null;
  }
}