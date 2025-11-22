// Debug login endpoint with detailed logging
export default async function handler(req, res) {
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

  const logs = [];

  try {
    logs.push('1. Parsing body...');
    let body;
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else {
      body = req.body;
    }

    const { email, password } = body || {};
    logs.push(`2. Email: ${email}, Password length: ${password ? password.length : 0}`);

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email y contraseña son requeridos',
        logs
      });
    }

    logs.push('3. Importing database connection...');
    const { getConnection } = await import('../../lib/database.js');
    
    logs.push('4. Connecting to database...');
    const connection = await getConnection();
    logs.push('5. Connected successfully');
    
    logs.push('6. Executing query...');
    const [rows] = await connection.execute(
      'SELECT id, email, nombre, password FROM usuarios WHERE email = ?',
      [email]
    );
    logs.push(`7. Query returned ${rows.length} rows`);

    if (rows.length === 0) {
      await connection.end();
      return res.status(200).json({ 
        success: false,
        message: 'Usuario no encontrado',
        logs,
        debug: { email, rowCount: 0 }
      });
    }

    const user = rows[0];
    logs.push(`8. User found: ${user.email}`);
    logs.push(`9. Password in DB: ${user.password ? user.password.substring(0, 10) + '...' : 'NULL'}`);
    logs.push(`10. Password provided: ${password.substring(0, 10)}...`);
    
    const isValidPassword = (password === user.password);
    logs.push(`11. Passwords match: ${isValidPassword}`);

    await connection.end();

    if (!isValidPassword) {
      return res.status(200).json({ 
        success: false,
        message: 'Contraseña incorrecta',
        logs,
        debug: {
          email: user.email,
          passwordLengthDB: user.password ? user.password.length : 0,
          passwordLengthProvided: password.length,
          match: isValidPassword
        }
      });
    }

    logs.push('12. Login successful, generating token...');
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { userId: user.id, email: user.email, nombre: user.nombre },
      process.env.JWT_SECRET || 'devsecret',
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login exitoso',
      token,
      user: { id: user.id, email: user.email, nombre: user.nombre },
      logs
    });

  } catch (error) {
    logs.push(`ERROR: ${error.message}`);
    return res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      stack: error.stack,
      logs
    });
  }
}
