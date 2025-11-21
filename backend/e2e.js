(async () => {
  try {
    const base = 'http://localhost:3002';

    console.log('1) LOGIN');
    const loginRes = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ana.martinez@correo.com', password: 'pass123' })
    });
    const login = await loginRes.json();
    console.log('LOGIN RESPONSE:', login);

    const token = login && login.token ? login.token : null;
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    console.log('\n2) META presupuestos');
    const metaRes = await fetch(`${base}/api/meta/presupuestos`, { headers: authHeaders });
    const meta = await metaRes.json();
    console.log('META:', meta);

    console.log('\n3) CREATE presupuesto');
    const presPayload = {
      nombre: 'E2E Test Pres',
      descripcion: 'Prueba E2E desde script',
      anno: 2025,
      fecha_ini: '2025-11-01',
      fecha_fin: '2025-12-31',
      status: 'Pendiente',
      observaciones: 'auto'
    };
    const presRes = await fetch(`${base}/api/presupuestos`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(presPayload)
    });
    const pres = await presRes.json();
    console.log('PRES RESPONSE:', pres);

    const presId = pres.idpresupuesto || pres.insertId || pres.id;
    const userId = (login && login.user && (login.user.idusuario || login.user.id)) || 1;

    console.log('\n4) CREATE gasto');
    const gastoPayload = {
      nombre: 'E2E Gasto',
      anno: 2025,
      fecha: '2025-11-02',
      proveedor: 'Proveedor X',
      monto: 100,
      moneda: 'MXN',
      tipo_cambio: null,
      monto_base: null,
      status: 'Pendiente',
      tipo: '1',
      categoria: '',
      idusuario: userId,
      idcuenta: 1,
      idplanta: 1,
      idpresupuesto: presId || 1
    };
    const gastoRes = await fetch(`${base}/api/gastos`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(gastoPayload)
    });
    const gasto = await gastoRes.json();
    console.log('GASTO RESPONSE:', gasto);

    console.log('\nE2E script finished');
    process.exit(0);
  } catch (err) {
    console.error('E2E ERROR', err);
    process.exit(1);
  }
})();
