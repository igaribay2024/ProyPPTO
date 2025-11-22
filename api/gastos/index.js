// Gastos API for Vercel
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
      // Obtener gastos del usuario
      const [rows] = await connection.execute(
        'SELECT * FROM gastos WHERE usuario_id = ? ORDER BY fecha DESC, created_at DESC LIMIT 100',
        [user.userId]
      );
      
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      // Crear nuevo gasto
      let body;
      if (typeof req.body === 'string') {
        body = JSON.parse(req.body);
      } else {
        body = req.body;
      }

      const { monto, descripcion, categoria, fecha } = body;

      if (!monto || !descripcion) {
        return res.status(400).json({ message: 'Monto y descripción son requeridos' });
      }

      const [result] = await connection.execute(
        'INSERT INTO gastos (usuario_id, monto, descripcion, categoria, fecha, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [user.userId, monto, descripcion, categoria || 'general', fecha || new Date().toISOString().split('T')[0]]
      );

      return res.status(201).json({
        success: true,
        message: 'Gasto creado exitosamente',
        gastoId: result.insertId
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });

  } catch (error) {
    console.error('Error en gastos:', error);
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