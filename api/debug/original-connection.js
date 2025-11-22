export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Verificando conexión original BD...');

    // Test with exact original credentials
    const mysql = require('mysql2/promise');
    
    const originalConfig = {
      host: 'mysql-presupuesto.mysql.database.azure.com',
      user: 'rootppto',
      password: process.env.DB_PASSWORD, // This should be the real password
      database: 'presupuesto_db',
      port: 3306,
      ssl: {
        rejectUnauthorized: false
      },
      connectTimeout: 20000,
      acquireTimeout: 20000,
      timeout: 20000
    };

    console.log('🔑 Intentando conexión con credenciales originales...');
    console.log('Host:', originalConfig.host);
    console.log('User:', originalConfig.user);
    console.log('Database:', originalConfig.database);
    console.log('Tiene password:', !!originalConfig.password);

    const connection = await mysql.createConnection(originalConfig);
    console.log('✅ Conexión exitosa con credenciales originales');

    // Test specific queries that the app needs
    const tests = [];

    // 1. Test usuarios table
    try {
      const [usuarios] = await connection.execute(
        'SELECT id, email, nombre, password, created_at FROM usuarios ORDER BY created_at DESC LIMIT 10'
      );
      tests.push({
        test: 'usuarios_query',
        status: 'success',
        count: usuarios.length,
        sample: usuarios.slice(0, 3).map(u => ({
          id: u.id,
          email: u.email,
          nombre: u.nombre,
          hasPassword: !!u.password,
          created_at: u.created_at
        }))
      });
      console.log(`👥 Usuarios encontrados: ${usuarios.length}`);
    } catch (error) {
      tests.push({
        test: 'usuarios_query',
        status: 'error',
        error: error.message
      });
    }

    // 2. Test gastos table
    try {
      const [gastos] = await connection.execute(
        'SELECT * FROM gastos ORDER BY fecha DESC LIMIT 5'
      );
      tests.push({
        test: 'gastos_query',
        status: 'success',
        count: gastos.length,
        sample: gastos
      });
      console.log(`💰 Gastos encontrados: ${gastos.length}`);
    } catch (error) {
      tests.push({
        test: 'gastos_query',
        status: 'error',
        error: error.message
      });
    }

    // 3. Test presupuestos table
    try {
      const [presupuestos] = await connection.execute(
        'SELECT * FROM presupuestos ORDER BY fecha_inicio DESC LIMIT 5'
      );
      tests.push({
        test: 'presupuestos_query',
        status: 'success',
        count: presupuestos.length,
        sample: presupuestos
      });
      console.log(`📊 Presupuestos encontrados: ${presupuestos.length}`);
    } catch (error) {
      tests.push({
        test: 'presupuestos_query',
        status: 'error',
        error: error.message
      });
    }

    // 4. Test specific user authentication
    try {
      const [testUser] = await connection.execute(
        'SELECT * FROM usuarios WHERE email = ? LIMIT 1',
        ['ana.martinez@correo.com']
      );
      tests.push({
        test: 'specific_user_auth',
        status: 'success',
        found: testUser.length > 0,
        user: testUser.length > 0 ? {
          id: testUser[0].id,
          email: testUser[0].email,
          nombre: testUser[0].nombre,
          hasPassword: !!testUser[0].password,
          passwordLength: testUser[0].password ? testUser[0].password.length : 0
        } : null
      });
      console.log(`🔍 Usuario ana.martinez encontrado: ${testUser.length > 0 ? 'Sí' : 'No'}`);
    } catch (error) {
      tests.push({
        test: 'specific_user_auth',
        status: 'error',
        error: error.message
      });
    }

    await connection.end();

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      connection: {
        host: originalConfig.host,
        user: originalConfig.user,
        database: originalConfig.database,
        status: 'connected'
      },
      tests,
      summary: {
        totalTests: tests.length,
        successfulTests: tests.filter(t => t.status === 'success').length,
        failedTests: tests.filter(t => t.status === 'error').length
      },
      environment: {
        hasDbPassword: !!process.env.DB_PASSWORD,
        dbHost: process.env.DB_HOST || 'not-set',
        dbUser: process.env.DB_USER || 'not-set',
        dbName: process.env.DB_NAME || 'not-set'
      }
    });

  } catch (error) {
    console.error('💥 Error conexión original:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Original connection failed',
      details: {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      },
      timestamp: new Date().toISOString(),
      troubleshooting: [
        '1. Verificar que la BD Azure esté activa y accesible',
        '2. Comprobar que el password en las variables de entorno sea correcto',
        '3. Verificar que el firewall Azure permita conexiones desde Vercel',
        '4. Revisar que las tablas existan en la BD con los nombres correctos',
        '5. Comprobar permisos del usuario rootppto en la BD'
      ]
    });
  }
}