(async () => {
  try {
    const targetEmail = 'igaribay@grupaltex.com';
    const base = 'http://127.0.0.1:3002/api/usuarios';
    const res = await fetch(base);
    const users = await res.json();
    const u = users.find(x => x.email === targetEmail);
    if (!u) {
      console.log('USER_NOT_FOUND');
      process.exit(0);
    }
    console.log('FOUND_ID=' + u.idusuario);
    // Update password
    const newPass = 'cambioUI123';
    const putRes = await fetch(`${base}/${u.idusuario}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPass }),
    });
    console.log('PUT STATUS', putRes.status);
    const putBody = await putRes.text();
    try { console.log('PUT BODY', JSON.parse(putBody)); } catch(e) { console.log('PUT BODY', putBody); }

    // Get updated user
    const getRes = await fetch(`${base}/${u.idusuario}`);
    console.log('GET STATUS', getRes.status);
    const getBody = await getRes.text();
    try { console.log('GET BODY', JSON.parse(getBody)); } catch(e) { console.log('GET BODY', getBody); }
  } catch (err) {
    console.error('ERR', err);
    process.exit(1);
  }
})();
