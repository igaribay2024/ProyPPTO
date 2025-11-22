// Mock data service when database is not available
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

  // Mock data que simula lo que debería estar en la base de datos
  const mockData = {
    usuarios: [
      { id: 1, email: 'test@test.com', nombre: 'Usuario Test', created_at: '2025-11-22' },
      { id: 2, email: 'ana.martinez@correo.com', nombre: 'Ana Martinez', created_at: '2025-11-20' },
      { id: 3, email: 'admin@sistema.com', nombre: 'Administrador', created_at: '2025-11-15' }
    ],
    gastos: [
      { id: 1, usuario_id: 1, monto: 50.00, descripcion: 'Almuerzo', categoria: 'comida', fecha: '2025-11-20' },
      { id: 2, usuario_id: 1, monto: 25.50, descripcion: 'Transporte', categoria: 'transporte', fecha: '2025-11-21' },
      { id: 3, usuario_id: 1, monto: 120.00, descripcion: 'Supermercado', categoria: 'hogar', fecha: '2025-11-22' },
      { id: 4, usuario_id: 2, monto: 75.00, descripcion: 'Cena', categoria: 'comida', fecha: '2025-11-21' }
    ],
    presupuestos: [
      { id: 1, usuario_id: 1, nombre: 'Presupuesto Mensual', monto_limite: 1000.00, categoria: 'general', periodo: 'mensual' },
      { id: 2, usuario_id: 1, nombre: 'Gastos de Comida', monto_limite: 300.00, categoria: 'comida', periodo: 'mensual' },
      { id: 3, usuario_id: 2, nombre: 'Presupuesto Ana', monto_limite: 800.00, categoria: 'general', periodo: 'mensual' }
    ]
  };

  // Simular estadísticas como las que calcularía la base de datos
  const statistics = {
    totalUsuarios: mockData.usuarios.length,
    totalGastos: mockData.gastos.length,
    totalPresupuestos: mockData.presupuestos.length,
    gastosPorUsuario: mockData.gastos.reduce((acc, gasto) => {
      acc[gasto.usuario_id] = (acc[gasto.usuario_id] || 0) + gasto.monto;
      return acc;
    }, {}),
    gastosUltimoMes: mockData.gastos.filter(g => g.fecha >= '2025-11-01').length
  };

  return res.status(200).json({
    success: true,
    message: 'Mock data service - database replacement',
    note: 'This is mock data because database connection failed',
    data: mockData,
    statistics,
    environment: {
      DB_HOST: process.env.DB_HOST,
      DB_USER: process.env.DB_USER,
      DB_NAME: process.env.DB_NAME,
      connectionStatus: 'FAILED - using mock data'
    },
    suggestions: [
      'Verify Azure MySQL firewall allows Vercel connections',
      'Check if DB_PASSWORD is correctly set in Vercel environment',
      'Verify database server is running and accessible',
      'Test connection from Azure CLI: mysql -h mysql-presupuesto.mysql.database.azure.com -u rootppto -p'
    ]
  });
}