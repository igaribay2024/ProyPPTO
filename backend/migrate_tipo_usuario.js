const mysql = require('mysql2/promise');

(async ()=>{
  try{
    const DB_NAME = process.env.DB_NAME || 'AltexPPTO';
    const DB_HOST = process.env.DB_HOST || 'localhost';
    const DB_USER = process.env.DB_USER || 'root';
  // If DB_PASS is defined (even empty string) use it; otherwise default to 'root'
  const DB_PASS = (process.env.DB_PASS !== undefined) ? process.env.DB_PASS : 'root';

    const conn = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASS, database: DB_NAME, multipleStatements: true });
    console.log('Connected to DB', DB_HOST, DB_NAME, DB_USER ? 'user set' : 'no user');

    // 1) Backup usuarios into a timestamped table
    const ts = new Date().toISOString().replace(/[:.]/g,'').replace('T','_').slice(0,15);
    const backupName = `usuarios_backup_${ts}`;
    console.log('Creating backup table:', backupName);
    await conn.query(`CREATE TABLE \`${backupName}\` AS SELECT * FROM usuarios;`);

    // 2) Create tipo_usuario lookup table
    console.log('Creating tipo_usuario table if not exists...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tipo_usuario (
        idtipo INT AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(20) NOT NULL UNIQUE,
        nombre VARCHAR(60) NOT NULL
      );
    `);

    // 3) Insert common mappings (codigo '1' -> Interno, '2' -> Externo)
    console.log("Inserting mapping rows (codigo '1'->Interno, '2'->Externo) with INSERT IGNORE...");
    await conn.query(`INSERT IGNORE INTO tipo_usuario (codigo,nombre) VALUES (?,?),(?,?);`, ['1','Interno','2','Externo']);

    // 4) Add tipo_id column if missing
    console.log('Adding tipo_id column to usuarios (if not exists)...');
    const [cols] = await conn.query("SHOW COLUMNS FROM usuarios LIKE 'tipo_id'");
    if (!cols || cols.length === 0) {
      await conn.query('ALTER TABLE usuarios ADD COLUMN tipo_id INT NULL;');
      console.log('Added column tipo_id');
    } else {
      console.log('Column tipo_id already exists, skipping ADD');
    }

    // 5) Populate tipo_id from existing tipo values
    console.log('Populating tipo_id from matching codigo...');
    await conn.query(`UPDATE usuarios u JOIN tipo_usuario t ON t.codigo = u.tipo SET u.tipo_id = t.idtipo WHERE u.tipo_id IS NULL;`);
    console.log('Populating tipo_id from matching nombre...');
    await conn.query(`UPDATE usuarios u JOIN tipo_usuario t ON t.nombre = u.tipo SET u.tipo_id = t.idtipo WHERE u.tipo_id IS NULL;`);

    // Also handle numeric-like string codes (just in case)
    console.log('Handling numeric codes 1/2 present as tipo...');
    await conn.query(`UPDATE usuarios u JOIN tipo_usuario t ON t.codigo = u.tipo SET u.tipo_id = t.idtipo WHERE u.tipo_id IS NULL AND u.tipo IN ('1','2');`);

    // 6) Add FK constraint if not exists
    console.log('Adding FK constraint fk_usuarios_tipo if not exists...');
    // Check existing constraints
    const [fks] = await conn.query(`SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'tipo_id' AND REFERENCED_TABLE_NAME = 'tipo_usuario'`, [DB_NAME]);
    if (!fks || fks.length === 0) {
      await conn.query(`ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_tipo FOREIGN KEY (tipo_id) REFERENCES tipo_usuario(idtipo);`);
      console.log('Foreign key fk_usuarios_tipo added');
    } else {
      console.log('Foreign key already present, skipping ADD');
    }

    console.log('Migration completed. Note: `usuarios.tipo` column kept for backward compatibility. Review and DROP it when safe.');

    await conn.end();
    process.exit(0);
  }catch(err){
    console.error('Migration error:', err && err.message);
    console.error(err);
    process.exit(1);
  }
})();
