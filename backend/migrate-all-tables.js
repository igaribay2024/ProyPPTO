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
  password: process.env.AZURE_DB_PASSWORD || '',
  database: 'presupuesto',
  ssl: {
    rejectUnauthorized: false
  }
};

async function migrateAllTables() {
  let localConn, azureConn;

  try {
    console.log('📡 Conectando a base de datos local...');
    localConn = await mysql.createConnection(localConfig);
    console.log('✅ Conectado a base de datos local\n');

    console.log('📡 Conectando a Azure MySQL...');
    azureConn = await mysql.createConnection(azureConfig);
    console.log('✅ Conectado a base de datos Azure\n');

    // Obtener lista de todas las tablas (excluyendo backups y vistas)
    const [tables] = await localConn.query('SHOW TABLES');
    const tableNames = tables
      .map(t => Object.values(t)[0])
      .filter(name => 
        !name.includes('backup') && 
        !name.startsWith('v_') &&
        name !== 'users' // Excluir tabla duplicada de usuarios
      );

    console.log('📋 Tablas a migrar:', tableNames.join(', '));
    console.log('');

    // Migrar cada tabla
    for (const tableName of tableNames) {
      console.log(`\n🔧 Procesando tabla: ${tableName}`);
      
      // Obtener estructura de la tabla
      const [createTableResult] = await localConn.query(`SHOW CREATE TABLE ${tableName}`);
      let createTableSQL = createTableResult[0]['Create Table'];
      
      // Modificar CREATE TABLE para Azure (eliminar restricciones de foreign keys temporalmente)
      createTableSQL = createTableSQL.replace(/CONSTRAINT.*?FOREIGN KEY.*?\n/g, '');
      
      // Crear tabla en Azure (si no existe, drop si existe)
      try {
        await azureConn.query(`DROP TABLE IF EXISTS ${tableName}`);
        await azureConn.query(createTableSQL);
        console.log(`  ✓ Tabla ${tableName} creada en Azure`);
      } catch (err) {
        console.log(`  ⚠ Error creando tabla ${tableName}: ${err.message}`);
        continue;
      }

      // Obtener datos de la tabla local
      const [rows] = await localConn.query(`SELECT * FROM ${tableName}`);
      console.log(`  📊 Encontrados ${rows.length} registros`);

      if (rows.length === 0) {
        console.log(`  ⏭ Tabla ${tableName} vacía, saltando...`);
        continue;
      }

      // Insertar datos en Azure
      let successCount = 0;
      let errorCount = 0;

      for (const row of rows) {
        try {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = columns.map(() => '?').join(', ');
          const columnNames = columns.join(', ');

          await azureConn.query(
            `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders}) 
             ON DUPLICATE KEY UPDATE ${columns.map(col => `${col}=VALUES(${col})`).join(', ')}`,
            values
          );
          successCount++;
        } catch (err) {
          errorCount++;
          if (errorCount <= 3) { // Solo mostrar primeros 3 errores
            console.log(`    ✗ Error insertando registro: ${err.message}`);
          }
        }
      }

      console.log(`  ✓ ${tableName}: ${successCount} registros migrados, ${errorCount} errores`);
    }

    console.log('\n\n✅ ¡Migración completa finalizada!');
    console.log('\n📊 Resumen de tablas migradas:');
    
    // Mostrar resumen
    for (const tableName of tableNames) {
      try {
        const [count] = await azureConn.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`  - ${tableName}: ${count[0].count} registros`);
      } catch (err) {
        console.log(`  - ${tableName}: Error obteniendo conteo`);
      }
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
  } finally {
    if (localConn) await localConn.end();
    if (azureConn) await azureConn.end();
  }
}

// Ejecutar migración
migrateAllTables();
