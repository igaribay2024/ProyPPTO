const mysql = require('mysql2/promise');

// Configuración base de datos local
const localConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'AltexPPTO'
};

// Configuración base de datos Azure
const azureConfig = {
  host: 'mysql-presupuesto.mysql.database.azure.com',
  user: 'rootppto',
  password: process.env.AZURE_DB_PASSWORD || '', // Debes proporcionar la contraseña
  database: 'presupuesto', // Base de datos real en Azure
  ssl: {
    rejectUnauthorized: false
  }
};

async function migrateData() {
  let localConn, azureConn;

  try {
    console.log('📡 Conectando a base de datos local...');
    localConn = await mysql.createConnection(localConfig);
    console.log('✅ Conectado a base de datos local');

    console.log('📡 Conectando a Azure MySQL (sin seleccionar DB)...');
    const azureConnNoDb = await mysql.createConnection({
      host: azureConfig.host,
      user: azureConfig.user,
      password: azureConfig.password,
      ssl: azureConfig.ssl
    });
    
    console.log('📋 Listando bases de datos disponibles en Azure:');
    const [databases] = await azureConnNoDb.query('SHOW DATABASES');
    databases.forEach(db => console.log(`  - ${db.Database}`));
    
    // Crear base de datos si no existe
    console.log(`\n🔧 Creando base de datos '${azureConfig.database}' si no existe...`);
    await azureConnNoDb.query(`CREATE DATABASE IF NOT EXISTS \`${azureConfig.database}\``);
    await azureConnNoDb.end();
    
    console.log('📡 Conectando a base de datos Azure...');
    azureConn = await mysql.createConnection(azureConfig);
    console.log('✅ Conectado a base de datos Azure');

    // Crear tablas si no existen
    console.log('\n🔧 Creando tablas en Azure...');
    
    await azureConn.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        nombre VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        tipo_usuario VARCHAR(50) DEFAULT 'usuario',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ Tabla usuarios creada');

    await azureConn.query(`
      CREATE TABLE IF NOT EXISTS gastos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        monto DECIMAL(10,2) NOT NULL,
        descripcion VARCHAR(255),
        categoria VARCHAR(100),
        fecha DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);
    console.log('  ✓ Tabla gastos creada');

    await azureConn.query(`
      CREATE TABLE IF NOT EXISTS presupuestos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        monto_limite DECIMAL(10,2) NOT NULL,
        categoria VARCHAR(100),
        periodo VARCHAR(50),
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);
    console.log('  ✓ Tabla presupuestos creada');

    // Migrar usuarios
    console.log('\n👥 Migrando usuarios...');
    const [usuarios] = await localConn.query('SELECT * FROM usuarios');
    console.log(`Encontrados ${usuarios.length} usuarios en local`);

    for (const usuario of usuarios) {
      try {
        await azureConn.query(
          'INSERT INTO usuarios (id, email, nombre, password, tipo_usuario, created_at) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), password=VALUES(password)',
          [usuario.id, usuario.email, usuario.nombre, usuario.password, usuario.tipo_usuario || 'usuario', usuario.created_at]
        );
        console.log(`  ✓ Usuario migrado: ${usuario.email}`);
      } catch (err) {
        console.log(`  ✗ Error migrando usuario ${usuario.email}: ${err.message}`);
      }
    }

    // Migrar gastos
    console.log('\n💰 Migrando gastos...');
    const [gastos] = await localConn.query('SELECT * FROM gastos');
    console.log(`Encontrados ${gastos.length} gastos en local`);

    for (const gasto of gastos) {
      try {
        await azureConn.query(
          'INSERT INTO gastos (id, usuario_id, monto, descripcion, categoria, fecha) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE monto=VALUES(monto), descripcion=VALUES(descripcion)',
          [gasto.idgasto, gasto.idusuario, gasto.monto_base || gasto.monto, gasto.nombre, gasto.categoria, gasto.fecha]
        );
        console.log(`  ✓ Gasto migrado: ${gasto.nombre} ($${gasto.monto_base || gasto.monto})`);
      } catch (err) {
        console.log(`  ✗ Error migrando gasto ${gasto.nombre}: ${err.message}`);
      }
    }

    // Migrar presupuestos
    console.log('\n📊 Migrando presupuestos...');
    const [presupuestos] = await localConn.query('SELECT * FROM presupuestos');
    console.log(`Encontrados ${presupuestos.length} presupuestos en local`);

    for (const presupuesto of presupuestos) {
      try {
        // Como presupuestos en local no tiene referencia directa a usuario, usamos usuario_id = 1 (usuario admin)
        await azureConn.query(
          'INSERT INTO presupuestos (id, usuario_id, nombre, monto_limite, periodo, descripcion) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE monto_limite=VALUES(monto_limite), descripcion=VALUES(descripcion)',
          [presupuesto.idpresupuesto, 1, presupuesto.nombre, 100000, `${presupuesto.anno}`, presupuesto.descripcion]
        );
        console.log(`  ✓ Presupuesto migrado: ${presupuesto.nombre} (${presupuesto.anno})`);
      } catch (err) {
        console.log(`  ✗ Error migrando presupuesto ${presupuesto.nombre}: ${err.message}`);
      }
    }

    console.log('\n✅ ¡Migración completada exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
  } finally {
    if (localConn) await localConn.end();
    if (azureConn) await azureConn.end();
  }
}

// Ejecutar migración
migrateData();