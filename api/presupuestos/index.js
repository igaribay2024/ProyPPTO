// Presupuestos API for Vercel
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  let connection;

  try {
    // Verify JWT token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Token de acceso requerido' });
    }

    let user;
    try {
      const jwt = await import('jsonwebtoken');
      user = jwt.default.verify(token, process.env.JWT_SECRET || 'devsecret');
    } catch (error) {
      return res.status(403).json({ message: 'Token inválido' });
    }

    const { getConnection } = await import('../../lib/database.js');
    connection = await getConnection();

    if (req.method === 'GET') {
      // Obtener presupuestos del usuario
      try {
        const [rows] = await connection.execute(
          'SELECT * FROM presupuestos ORDER BY fecha_ini DESC LIMIT 100'
        );
        
        return res.status(200).json(rows);
      } catch (dbError) {
        // Fallback to mock data if database fails
        console.log('Database failed, returning mock presupuestos:', dbError.message);
        const mockPresupuestos = [
          { id: 1, usuario_id: user.userId, nombre: 'Presupuesto Mensual (mock)', monto_limite: 1000.00, categoria: 'general', periodo: 'mensual' },
          { id: 2, usuario_id: user.userId, nombre: 'Gastos de Comida (mock)', monto_limite: 300.00, categoria: 'comida', periodo: 'mensual' }
        ];
        return res.status(200).json(mockPresupuestos);
      }
    }

    if (req.method === 'POST') {
      // Crear nuevo presupuesto
      let body;
      if (typeof req.body === 'string') {
        body = JSON.parse(req.body);
      } else {
        body = req.body;
      }

      const { nombre, monto_limite, categoria, periodo, descripcion } = body;

      if (!nombre || !monto_limite) {
        return res.status(400).json({ message: 'Nombre y monto límite son requeridos' });
      }

      const currentYear = new Date().getFullYear();
      const fechaIni = `${currentYear}-01-01`;
      const fechaFin = `${currentYear}-12-31`;
      
      const [result] = await connection.execute(
        'INSERT INTO presupuestos (nombre, anno, fecha_ini, fecha_fin, status, descripcion, tipo_cambio, factor_inflacion, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [nombre, currentYear, fechaIni, fechaFin, 'Proceso', descripcion || nombre, 19, 4, '']
      );

      return res.status(201).json({
        success: true,
        message: 'Presupuesto creado exitosamente',
        presupuestoId: result.insertId
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });

  } catch (error) {
    console.error('Error en presupuestos:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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