// Database diagnostic endpoint for troubleshooting
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let connection;

  try {
    const { getConnection } = await import('../../lib/database.js');
    connection = await getConnection();
    
    const diagnostics = {};

    // Test 1: Basic connection
    try {
      const [connectionTest] = await connection.execute('SELECT 1 as test_connection');
      diagnostics.connection = { success: true, result: connectionTest };
    } catch (error) {
      diagnostics.connection = { success: false, error: error.message };
    }

    // Test 2: Check available databases
    try {
      const [databases] = await connection.execute('SHOW DATABASES');
      diagnostics.databases = { success: true, result: databases };
    } catch (error) {
      diagnostics.databases = { success: false, error: error.message };
    }

    // Test 3: Check current database
    try {
      const [currentDb] = await connection.execute('SELECT DATABASE() as current_db');
      diagnostics.currentDatabase = { success: true, result: currentDb };
    } catch (error) {
      diagnostics.currentDatabase = { success: false, error: error.message };
    }

    // Test 4: Check tables
    try {
      const [tables] = await connection.execute('SHOW TABLES');
      diagnostics.tables = { success: true, result: tables };
    } catch (error) {
      diagnostics.tables = { success: false, error: error.message };
    }

    // Test 5: Check usuarios table structure
    try {
      const [usuariosStructure] = await connection.execute('DESCRIBE usuarios');
      diagnostics.usuariosStructure = { success: true, result: usuariosStructure };
    } catch (error) {
      diagnostics.usuariosStructure = { success: false, error: error.message };
    }

    // Test 6: Count usuarios
    try {
      const [usuariosCount] = await connection.execute('SELECT COUNT(*) as total_usuarios FROM usuarios');
      diagnostics.usuariosCount = { success: true, result: usuariosCount };
    } catch (error) {
      diagnostics.usuariosCount = { success: false, error: error.message };
    }

    // Test 7: Sample usuarios (without passwords)
    try {
      const [usuariosSample] = await connection.execute('SELECT id, email, nombre FROM usuarios LIMIT 5');
      diagnostics.usuariosSample = { success: true, result: usuariosSample };
    } catch (error) {
      diagnostics.usuariosSample = { success: false, error: error.message };
    }

    // Test 8: Check gastos table
    try {
      const [gastosStructure] = await connection.execute('DESCRIBE gastos');
      diagnostics.gastosStructure = { success: true, result: gastosStructure };
    } catch (error) {
      diagnostics.gastosStructure = { success: false, error: error.message };
    }

    // Test 9: Check presupuestos table  
    try {
      const [presupuestosStructure] = await connection.execute('DESCRIBE presupuestos');
      diagnostics.presupuestosStructure = { success: true, result: presupuestosStructure };
    } catch (error) {
      diagnostics.presupuestosStructure = { success: false, error: error.message };
    }

    return res.status(200).json({
      success: true,
      message: 'Database diagnostics completed',
      diagnostics,
      environment: {
        DB_HOST: process.env.DB_HOST,
        DB_USER: process.env.DB_USER,
        DB_NAME: process.env.DB_NAME,
        DB_PORT: process.env.DB_PORT,
        DB_SSL_ENABLED: process.env.DB_SSL_ENABLED
      }
    });

  } catch (error) {
    console.error('Database diagnostics error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error running diagnostics',
      error: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (e) {
        console.log('Error closing connection:', e.message);
      }
    }
  }
}