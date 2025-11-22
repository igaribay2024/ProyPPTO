const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const azureConfig = {
  host: 'mysql-presupuesto.mysql.database.azure.com',
  user: 'rootppto',
  password: '#ppto2025',
  database: 'presupuesto',
  ssl: {
    rejectUnauthorized: false
  }
};

async function updatePasswords() {
  let conn;
  try {
    console.log('📡 Conectando a Azure MySQL...');
    conn = await mysql.createConnection(azureConfig);
    console.log('✅ Conectado exitosamente\n');

    console.log('🔐 Actualizando contraseñas a bcrypt hash...\n');

    const [usuarios] = await conn.query('SELECT id, email, password FROM usuarios');
    
    for (const usuario of usuarios) {
      // Si la contraseña no empieza con $2a$ o $2b$, no es un hash de bcrypt
      if (!usuario.password.startsWith('$2a$') && !usuario.password.startsWith('$2b$')) {
        const hashedPassword = await bcrypt.hash(usuario.password, 10);
        await conn.query('UPDATE usuarios SET password = ? WHERE id = ?', [hashedPassword, usuario.id]);
        console.log(`  ✓ Usuario ${usuario.email}: contraseña "${usuario.password}" → bcrypt hash`);
      } else {
        console.log(`  ⏭ Usuario ${usuario.email}: ya tiene hash bcrypt`);
      }
    }

    console.log('\n✅ ¡Contraseñas actualizadas exitosamente!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

updatePasswords();
