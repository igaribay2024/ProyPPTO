(async()=>{
  try{
    const res = await fetch('http://127.0.0.1:3002/api/meta/usuarios');
    const j = await res.json();
    console.log('META USUARIOS:', j);
  }catch(e){console.error(e);process.exit(1)}
})();
