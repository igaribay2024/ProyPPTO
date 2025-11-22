const mysql = require('mysql2/promise');

const azureConfig = {
  host: 'mysql-presupuesto.mysql.database.azure.com',
  user: 'rootppto',
  password: '#ppto2025',
  database: 'presupuesto',
  ssl: {
    rejectUnauthorized: false
  }
};

async function testLogin() {
  let conn;
  try {
    console.log('📡 Conectando a Azure MySQL...');
    conn = await mysql.createConnection(azureConfig);
    console.log('✅ Conectado\n');

    const email = 'ana.martinez@correo.com';
    const password = 'pass234';

    console.log('🔍 Buscando usuario:', email);
    const [rows] = await conn.execute(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );

    console.log('\n📋 Resultado de la consulta:');
    console.log('Número de filas:', rows.length);
    
    if (rows.length > 0) {
      const user = rows[0];
      console.log('\n👤 Datos del usuario:');
      console.log('  ID:', user.id);
      console.log('  Email:', user.email);
      console.log('  Nombre:', user.nombre);
      console.log('  Password:', user.password);
      console.log('  Password_hash:', user.password_hash);
      
      console.log('\n🔐 Verificación de contraseña:');
      console.log('  Password ingresada:', password);
      console.log('  Password en DB:', user.password);
      console.log('  ¿Son iguales?:', password === user.password);
      console.log('  ¿Son iguales (===)?:', password === user.password);
      console.log('  Tipo password ingresada:', typeof password);
      console.log('  Tipo password DB:', typeof user.password);
      console.log('  Length password ingresada:', password.length);
      console.log('  Length password DB:', user.password ? user.password.length : 0);
      
      // Verificar espacios
      console.log('  Password DB con trim:', user.password ? user.password.trim() : null);
      console.log('  ¿Son iguales con trim?:', password === (user.password ? user.password.trim() : ''));
    } else {
      console.log('❌ Usuario no encontrado');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

testLogin();
