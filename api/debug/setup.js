// Setup test data for debugging - works with or without database
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // For GET requests, just return environment info
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'Setup endpoint ready - use POST to create test data',
      environment: {
        DB_HOST: process.env.DB_HOST,
        DB_USER: process.env.DB_USER,
        DB_NAME: process.env.DB_NAME,
        DB_PORT: process.env.DB_PORT,
        hasPassword: !!process.env.DB_PASSWORD
      },
      instructions: 'Send POST request to create test data'
    });
  }

  let connection;

  try {
    const { getConnection } = await import('../../lib/database.js');
    const bcrypt = await import('bcryptjs');
    
    connection = await getConnection();
    
    const results = {};

    // Create test user with bcrypt password
    try {
      const testPassword = 'test123';
      const hashedPassword = await bcrypt.default.hash(testPassword, 12);
      
      const [insertResult] = await connection.execute(
        'INSERT INTO usuarios (nombre, email, password, tipo_usuario, created_at) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE password = VALUES(password)',
        ['Usuario Test Real', 'test@test.com', hashedPassword, 'usuario']
      );
      
      results.testUser = { 
        success: true, 
        message: 'Test user created/updated',
        userId: insertResult.insertId || 'updated existing'
      };
    } catch (error) {
      results.testUser = { success: false, error: error.message };
    }

    // Create sample gastos for test user
    try {
      // First get the test user ID
      const [userRows] = await connection.execute('SELECT id FROM usuarios WHERE email = ?', ['test@test.com']);
      
      if (userRows.length > 0) {
        const testUserId = userRows[0].id;
        
        const sampleGastos = [
          { monto: 50.00, descripcion: 'Almuerzo', categoria: 'comida', fecha: '2025-11-20' },
          { monto: 25.50, descripcion: 'Transporte', categoria: 'transporte', fecha: '2025-11-21' },
          { monto: 120.00, descripcion: 'Supermercado', categoria: 'hogar', fecha: '2025-11-22' }
        ];

        for (const gasto of sampleGastos) {
          await connection.execute(
            'INSERT INTO gastos (usuario_id, monto, descripcion, categoria, fecha, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [testUserId, gasto.monto, gasto.descripcion, gasto.categoria, gasto.fecha]
          );
        }
        
        results.sampleGastos = { success: true, message: `Created ${sampleGastos.length} sample gastos` };
      }
    } catch (error) {
      results.sampleGastos = { success: false, error: error.message };
    }

    // Create sample presupuestos for test user
    try {
      const [userRows] = await connection.execute('SELECT id FROM usuarios WHERE email = ?', ['test@test.com']);
      
      if (userRows.length > 0) {
        const testUserId = userRows[0].id;
        
        const samplePresupuestos = [
          { nombre: 'Presupuesto Mensual', monto_limite: 1000.00, categoria: 'general', periodo: 'mensual' },
          { nombre: 'Gastos de Comida', monto_limite: 300.00, categoria: 'comida', periodo: 'mensual' }
        ];

        for (const presupuesto of samplePresupuestos) {
          await connection.execute(
            'INSERT INTO presupuestos (usuario_id, nombre, monto_limite, categoria, periodo, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [testUserId, presupuesto.nombre, presupuesto.monto_limite, presupuesto.categoria, presupuesto.periodo]
          );
        }
        
        results.samplePresupuestos = { success: true, message: `Created ${samplePresupuestos.length} sample presupuestos` };
      }
    } catch (error) {
      results.samplePresupuestos = { success: false, error: error.message };
    }

    return res.status(200).json({
      success: true,
      message: 'Test data setup completed',
      results
    });

  } catch (error) {
    console.error('Setup test data error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error setting up test data',
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