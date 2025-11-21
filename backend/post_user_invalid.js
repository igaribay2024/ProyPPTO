(async () => {
  try {
    const body = {
      nombre: 'Test Invalid Tipo',
      telefono: '9998887777',
      email: 'invalid.tipo@example.com',
      genero: 'M',
      password: 'pass123',
      tipo: 'NO_SUCH_TYPE',
      status: 1,
      dependencia: 'TI',
      rol: 'Tester',
      idplanta: null
    };
    const res = await fetch('http://127.0.0.1:3002/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    console.log('STATUS', res.status);
    const txt = await res.text();
    try { console.log('BODY', JSON.parse(txt)); } catch(e) { console.log('BODY', txt); }
  } catch (err) {
    console.error('ERR', err);
    process.exit(1);
  }
})();
