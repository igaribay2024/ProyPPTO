require('dotenv').config();

const mysql = require('mysql2/promise');

// Configuración específica para Railway con MySQL Azure
const dbConfig = {
  host: process.env.DB_HOST || 'mysql-presupuesto.mysql.database.azure.com',
  user: process.env.DB_USER || 'rootppto',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'presupuesto_db',
  port: parseInt(process.env.DB_PORT) || 3306,
  ssl: {
    rejectUnauthorized: false, // Para Azure MySQL
    ca: require('fs').readFileSync('./MysqlflexGlobalRootCA.crt.pem', 'utf8')
  },
  connectTimeout: 20000,
  acquireTimeout: 20000,
  connectionLimit: 10,
  reconnect: true
};

console.log('🚀 Railway DB Config:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port,
  ssl: !!dbConfig.ssl
});

const pool = mysql.createPool(dbConfig);

// Test de conexión
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Railway - Conexión exitosa a MySQL Azure');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Railway - Error conectando a MySQL Azure:', error.message);
    return false;
  }
}

// Ejecutar test al inicializar
testConnection();

module.exports = pool;