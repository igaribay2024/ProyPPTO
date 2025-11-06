Backend minimal para AltexPPTO

Instrucciones rápidas:

1. Abre una terminal y ve a la carpeta `backend`:

```powershell
cd backend
```

2. Instala dependencias:

```powershell
npm install
```

3. Copia el archivo `.env.example` a `.env` si quieres ajustar valores (por defecto usa host `localhost`, user `root`, pass `root`, db `AltexPPTO`):

```powershell
copy .env.example .env
```

4. Inicia el servidor:

```powershell
npm start
```

5. Endpoints:
- POST /api/login  -> body: { "email": "ana.martinez@correo.com", "password": "1234" }
- GET /api/health  -> { ok: true }

Notas:
- En el arranque el servidor crea la base de datos y la tabla `users` si no existen, e inserta un usuario por defecto (ana.martinez@correo.com / 1234).
- Asegúrate de tener MySQL/MariaDB ejecutándose localmente y accesible con las credenciales configuradas.
