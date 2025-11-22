// Simple connection test without timeout
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Show environment variables first
    const envInfo = {
      DB_HOST: process.env.DB_HOST,
      DB_USER: process.env.DB_USER,
      DB_NAME: process.env.DB_NAME,
      DB_PORT: process.env.DB_PORT,
      DB_SSL_ENABLED: process.env.DB_SSL_ENABLED,
      hasPassword: !!process.env.DB_PASSWORD
    };

    let connectionResult = null;
    let connectionError = null;

    try {
      // Try basic connection with shorter timeout
      let mysql;
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
        connectTimeout: 10000, // 10 seconds instead of 20
        acquireTimeout: 10000
      });

      // Test basic query
      const [result] = await connection.execute('SELECT 1 as test, NOW() as current_time');
      connectionResult = result;
      
      await connection.end();

    } catch (error) {
      connectionError = {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }

    return res.status(200).json({
      success: connectionResult ? true : false,
      environment: envInfo,
      connectionTest: connectionResult,
      connectionError: connectionError,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Connection test error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error testing connection',
      error: error.message,
      environment: {
        DB_HOST: process.env.DB_HOST,
        DB_USER: process.env.DB_USER,
        DB_NAME: process.env.DB_NAME,
        hasPassword: !!process.env.DB_PASSWORD
      }
    });
  }
}