const http = require('http');
const payload = {
  descripcion: 'Prueba automatizada',
  monto_mes: 90000,
  monto_base: 90000,
  moneda: 'MXN',
  fecha_ini: '2025-11-01',
  fecha_fin: '2025-11-30',
  status: 'Proceso',
  tipo: 1,
  categoria: 'EQUIPO',
  idusuario: 1,
  idcuenta: 1,
  idplanta: 1,
  idpresupuesto: 1
};

const data = JSON.stringify(payload);
const opts = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/partidas',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(opts, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log('BODY', body);
  });
});

req.on('error', (err) => console.error('ERR', err));
req.write(data);
req.end();
