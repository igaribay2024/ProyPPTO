// Debug endpoint to test database connection
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const { getConnection } = await import('../../lib/database.js');
    const connection = await getConnection();
    
    // Test query
    const [users] = await connection.execute(
      'SELECT id, email, nombre, password FROM usuarios WHERE email = ?',
      ['ana.martinez@correo.com']
    );
    
    await connection.end();
    
    return res.status(200).json({
      success: true,
      dbConnected: true,
      userFound: users.length > 0,
      userData: users.length > 0 ? {
        id: users[0].id,
        email: users[0].email,
        nombre: users[0].nombre,
        passwordLength: users[0].password ? users[0].password.length : 0,
        passwordPreview: users[0].password ? users[0].password.substring(0, 10) + '...' : 'NO PASSWORD'
      } : null,
      env: {
        DB_HOST: process.env.DB_HOST,
        DB_USER: process.env.DB_USER,
        DB_NAME: process.env.DB_NAME,
        DB_PORT: process.env.DB_PORT,
        hasPassword: !!process.env.DB_PASSWORD
      }
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      env: {
        DB_HOST: process.env.DB_HOST,
        DB_USER: process.env.DB_USER,
        DB_NAME: process.env.DB_NAME,
        DB_PORT: process.env.DB_PORT,
        hasPassword: !!process.env.DB_PASSWORD
      }
    });
  }
}
