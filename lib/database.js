// Database connection for Vercel with MySQL Azure
let mysql;

async function getConnection() {
  if (!mysql) {
    mysql = (await import('mysql2/promise')).default;
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'mysql-presupuesto.mysql.database.azure.com',
    user: process.env.DB_USER || 'rootppto',
    password: process.env.DB_PASSWORD || '#ppto2025',
    database: process.env.DB_NAME || 'presupuesto',
    port: parseInt(process.env.DB_PORT) || 3306,
    ssl: {
      rejectUnauthorized: false
    },
    connectTimeout: 20000,
    acquireTimeout: 20000
  });

  return connection;
}

export { getConnection };