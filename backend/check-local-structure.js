const mysql = require('mysql2/promise');

// Configuración base de datos local
const localConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'AltexPPTO'
};

async function checkStructure() {
  let localConn;

  try {
    console.log('📡 Conectando a base de datos local...');
    localConn = await mysql.createConnection(localConfig);
    console.log('✅ Conectado a base de datos local\n');

    // Verificar estructura de gastos
    console.log('📋 Estructura de tabla GASTOS:');
    const [gastosStructure] = await localConn.query('DESCRIBE gastos');
    console.table(gastosStructure);

    console.log('\n📋 Primeros 3 registros de GASTOS:');
    const [gastosData] = await localConn.query('SELECT * FROM gastos LIMIT 3');
    console.table(gastosData);

    // Verificar estructura de presupuestos
    console.log('\n📋 Estructura de tabla PRESUPUESTOS:');
    const [presupuestosStructure] = await localConn.query('DESCRIBE presupuestos');
    console.table(presupuestosStructure);

    console.log('\n📋 Primeros 3 registros de PRESUPUESTOS:');
    const [presupuestosData] = await localConn.query('SELECT * FROM presupuestos LIMIT 3');
    console.table(presupuestosData);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (localConn) await localConn.end();
  }
}

checkStructure();
