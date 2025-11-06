(async () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const payloadPath = path.join(__dirname, 'userpayload.json');
    const body = JSON.parse(fs.readFileSync(payloadPath,'utf8'));
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
