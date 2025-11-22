// Simple login function for Vercel
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

  try {
    // Parse JSON body manually for Vercel
    let body;
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else {
      body = req.body;
    }

    const { email, password } = body || {};

    console.log('Login attempt:', { email, password: password ? '[PROVIDED]' : '[MISSING]' });

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email y contraseña son requeridos' 
      });
    }

    // Mock response for testing
    if (email === 'test@test.com' && password === 'test123') {
      return res.status(200).json({
        success: true,
        message: 'Login exitoso',
        token: 'mock-jwt-token-123456',
        user: {
          id: 1,
          email: email,
          nombre: 'Usuario Test'
        }
      });
    }

    return res.status(401).json({ 
      success: false,
      message: 'Credenciales inválidas' 
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};