export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const mysql = require('mysql2/promise');
  
  try {
    console.log('🔍 Iniciando diagnóstico completo de estructura BD...');
    
    // Database configuration
    const dbConfig = {
      host: process.env.DB_HOST || 'mysql-presupuesto.mysql.database.azure.com',
      user: process.env.DB_USER || 'rootppto',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'presupuesto_db',
      port: parseInt(process.env.DB_PORT) || 3306,
      ssl: {
        rejectUnauthorized: false
      },
      connectTimeout: 15000,
      acquireTimeout: 15000,
      timeout: 15000
    };

    console.log('📋 Config BD:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      port: dbConfig.port,
      hasPassword: !!dbConfig.password
    });

    // Test connection
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión establecida');

    // Get database info
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('📁 Bases de datos disponibles:', databases.map(db => db.Database));

    // Get tables in current database
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📊 Tablas en la BD:', tables);

    const tableStructure = {};

    // Analyze each table
    for (const table of tables) {
      const tableName = table[`Tables_in_${dbConfig.database}`];
      console.log(`🔍 Analizando tabla: ${tableName}`);
      
      // Get table structure
      const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
      
      // Get row count
      const [count] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
      
      // Get sample data
      const [sample] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 3`);
      
      tableStructure[tableName] = {
        columns: columns,
        rowCount: count[0].count,
        sampleData: sample
      };
      
      console.log(`📈 Tabla ${tableName}: ${count[0].count} registros`);
    }

    // Check for specific tables we need
    const requiredTables = ['usuarios', 'gastos', 'presupuestos'];
    const missingTables = requiredTables.filter(table => 
      !tables.some(t => t[`Tables_in_${dbConfig.database}`] === table)
    );

    // Check usuarios table specifically
    let usuariosInfo = null;
    if (!missingTables.includes('usuarios')) {
      try {
        const [usuarios] = await connection.execute('SELECT id, email, nombre, created_at FROM usuarios LIMIT 5');
        usuariosInfo = usuarios;
        console.log('👥 Usuarios encontrados:', usuarios.length);
      } catch (error) {
        console.log('❌ Error leyendo usuarios:', error.message);
      }
    }

    await connection.end();

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      database: {
        host: dbConfig.host,
        database: dbConfig.database,
        connectionStatus: 'success'
      },
      analysis: {
        totalTables: tables.length,
        tableNames: tables.map(t => t[`Tables_in_${dbConfig.database}`]),
        requiredTables,
        missingTables,
        tableStructure
      },
      usuarios: usuariosInfo,
      recommendations: missingTables.length > 0 ? 
        [`Faltan las siguientes tablas: ${missingTables.join(', ')}`] : 
        ['Estructura de BD parece correcta']
    });

  } catch (error) {
    console.error('💥 Error en diagnóstico BD:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Database analysis failed',
      details: {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      },
      timestamp: new Date().toISOString(),
      suggestions: [
        'Verificar que la BD Azure esté activa',
        'Comprobar credenciales de acceso',
        'Revisar configuración de firewall',
        'Validar que las tablas existan en la BD'
      ]
    });
  }
}