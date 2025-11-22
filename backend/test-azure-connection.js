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

async function testConnection() {
  let conn;
  try {
    console.log('📡 Conectando a Azure MySQL...');
    conn = await mysql.createConnection(azureConfig);
    console.log('✅ Conectado exitosamente\n');

    console.log('👥 Consultando usuarios:');
    const [usuarios] = await conn.query('SELECT id, email, nombre FROM usuarios LIMIT 5');
    console.table(usuarios);

    console.log('\n🔍 Buscando usuario ana.martinez@correo.com:');
    const [user] = await conn.query('SELECT * FROM usuarios WHERE email = ?', ['ana.martinez@correo.com']);
    if (user.length > 0) {
      console.log('Usuario encontrado:');
      console.log('  ID:', user[0].id);
      console.log('  Email:', user[0].email);
      console.log('  Nombre:', user[0].nombre);
      console.log('  Password hash:', user[0].password.substring(0, 20) + '...');
      console.log('  Tipo:', user[0].tipo_usuario);
    } else {
      console.log('❌ Usuario NO encontrado');
    }

    console.log('\n💰 Consultando gastos:');
    const [gastos] = await conn.query('SELECT id, usuario_id, descripcion, monto FROM gastos LIMIT 5');
    console.table(gastos);

    console.log('\n📊 Consultando presupuestos:');
    const [presupuestos] = await conn.query('SELECT id, usuario_id, nombre, monto_limite FROM presupuestos LIMIT 5');
    console.table(presupuestos);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

testConnection();
