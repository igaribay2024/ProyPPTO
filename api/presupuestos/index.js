import { getConnection } from '../../lib/database.js';
import jwt from 'jsonwebtoken';

// Helper function to verify JWT token
function verifyToken(authHeader) {
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) throw new Error('Token requerido');
  
  return jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
}

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
    // Verificar token
    const user = verifyToken(req.headers['authorization']);
    connection = await getConnection();

    if (req.method === 'GET') {
      // Obtener presupuestos del usuario
      const [rows] = await connection.execute(
        'SELECT * FROM presupuestos WHERE usuario_id = ? ORDER BY created_at DESC',
        [user.userId]
      );
      
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      // Crear nuevo presupuesto
      const { nombre, monto_limite, categoria, periodo, descripcion } = req.body;

      if (!nombre || !monto_limite) {
        return res.status(400).json({ message: 'Nombre y monto límite son requeridos' });
      }

      const [result] = await connection.execute(
        'INSERT INTO presupuestos (usuario_id, nombre, monto_limite, categoria, periodo, descripcion, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [user.userId, nombre, monto_limite, categoria || 'general', periodo || 'mensual', descripcion || '']
      );

      return res.status(201).json({
        message: 'Presupuesto creado exitosamente',
        presupuestoId: result.insertId
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });

  } catch (error) {
    console.error('Error en presupuestos:', error);
    if (error.message === 'Token requerido' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};