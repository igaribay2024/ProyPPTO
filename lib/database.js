// Database connection for Vercel with MySQL Azure
let mysql;

async function getConnection() {
  if (!mysql) {
    mysql = (await import('mysql2/promise')).default;
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306,
    ssl: process.env.DB_SSL_ENABLED === 'true' ? {
      rejectUnauthorized: false
    } : false,
    connectTimeout: 20000,
    acquireTimeout: 20000
  });

  return connection;
}

export { getConnection };