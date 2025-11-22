import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getConnection } from '../../lib/database.js';

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

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let connection;

  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y contraseña son requeridos' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    connection = await getConnection();

    // Verificar si el email ya existe
    const [existing] = await connection.execute(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: 'El email ya está registrado' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insertar nuevo usuario
    const [result] = await connection.execute(
      'INSERT INTO usuarios (nombre, email, password, tipo_usuario, created_at) VALUES (?, ?, ?, ?, NOW())',
      [nombre, email, hashedPassword, 'usuario']
    );

    const userId = result.insertId;

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: userId, 
        email: email,
        nombre: nombre
      },
      process.env.JWT_SECRET || 'devsecret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      token,
      user: {
        id: userId,
        email: email,
        nombre: nombre
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};