require('dotenv').config();
const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root', //staffaltex
  password: 'root', //Hola.123
  database: 'AltexPPTO'
});
connection.connect((err) => {
  if (err) throw err;
  console.log('Conectado a MySQL');

  connection.query('SELECT * from plantas', (err, rows) => {
  if (err) throw err;
  console.log('Resultado:', rows[0].resultado); // Debe mostrar 2
});

});
module.exports = connection;
``

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});
module.exports = pool.promise();


