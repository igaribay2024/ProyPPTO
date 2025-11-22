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

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Simular estadísticas del dashboard con datos mock realistas
    const dashboardData = {
      resumen: {
        totalGastos: 195.50,
        totalPresupuestos: 2100.00,
        diferencia: 1904.50,
        porcentaje: 9.3,
        alertas: false
      },
      gastosPorCategoria: [
        { categoria: 'comida', total: 125.50, porcentaje: 64.2 },
        { categoria: 'transporte', total: 25.50, porcentaje: 13.0 },
        { categoria: 'hogar', total: 120.00, porcentaje: 61.4 },
        { categoria: 'entretenimiento', total: 44.50, porcentaje: 22.8 }
      ],
      gastosRecientes: [
        { id: 1, descripcion: 'Almuerzo', monto: 50.00, categoria: 'comida', fecha: '2025-11-22' },
        { id: 2, descripcion: 'Transporte', monto: 25.50, categoria: 'transporte', fecha: '2025-11-21' },
        { id: 3, descripcion: 'Supermercado', monto: 120.00, categoria: 'hogar', fecha: '2025-11-20' },
        { id: 4, descripcion: 'Cine', monto: 44.50, categoria: 'entretenimiento', fecha: '2025-11-19' }
      ],
      presupuestosActivos: [
        { id: 1, nombre: 'Presupuesto Mensual', limite: 1000.00, gastado: 195.50, disponible: 804.50, porcentaje: 19.6 },
        { id: 2, nombre: 'Gastos de Comida', limite: 300.00, gastado: 125.50, disponible: 174.50, porcentaje: 41.8 },
        { id: 3, nombre: 'Entretenimiento', limite: 150.00, gastado: 44.50, disponible: 105.50, porcentaje: 29.7 }
      ],
      tendenciaMensual: {
        labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
        gastosEjecutados: [180, 220, 195, 240, 210, 185, 205, 230, 190, 175, 195, 0],
        partirasPresupuesto: [200, 200, 200, 250, 250, 200, 220, 250, 200, 180, 200, 200]
      }
    };

    return res.status(200).json({
      success: true,
      message: 'Dashboard data (usando datos mock por problemas de BD)',
      data: dashboardData,
      source: 'mock-dashboard',
      timestamp: new Date().toISOString(),
      note: 'Datos simulados mientras se resuelve la conexión con Azure MySQL'
    });

  } catch (error) {
    console.error('Error generating dashboard mock data:', error);
    return res.status(500).json({
      success: false,
      error: 'Error generating dashboard data',
      message: error.message
    });
  }
}