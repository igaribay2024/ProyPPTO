# 🚀 Guía de Deployment Alternativo - Railway + Netlify

## 📋 **Resumen del Plan:**
- **Backend**: Railway (gratuito, conectado a MySQL Azure)
- **Frontend**: Netlify (gratuito, deploy desde GitHub)
- **Base de datos**: Tu MySQL Azure existente

## 🔧 **Paso 1: Preparar Backend para Railway**

### 1.1 Crear archivo railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### 1.2 Actualizar package.json del backend
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 1.3 Variables de entorno para Railway
```env
DB_HOST=mysql-presupuesto.mysql.database.azure.com
DB_USER=rootppto
DB_PASSWORD=[tu-password]
DB_NAME=presupuesto_db
DB_PORT=3306
DB_SSL_ENABLED=true
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://[tu-app].netlify.app
```

## 🌐 **Paso 2: Deploy Backend en Railway**

### 2.1 Crear cuenta en Railway
1. Ve a: https://railway.app
2. Inicia sesión con GitHub
3. Conecta tu repositorio ProyPPTO

### 2.2 Configurar proyecto Railway
1. **New Project** → **Deploy from GitHub repo**
2. Selecciona: `igaribay2024/ProyPPTO`
3. **Root Directory**: `/backend`
4. **Start Command**: `npm start`

### 2.3 Configurar variables de entorno
En Railway Dashboard:
- `DB_HOST`: `mysql-presupuesto.mysql.database.azure.com`
- `DB_USER`: `rootppto`
- `DB_PASSWORD`: [tu-password-mysql]
- `DB_NAME`: `presupuesto_db`
- `DB_SSL_ENABLED`: `true`
- `PORT`: `3000`

## 🎨 **Paso 3: Deploy Frontend en Netlify**

### 3.1 Crear cuenta en Netlify
1. Ve a: https://netlify.com
2. Inicia sesión con GitHub
3. **New site from Git**

### 3.2 Configurar build de Netlify
1. **Repository**: `igaribay2024/ProyPPTO`
2. **Base directory**: `/` (raíz)
3. **Build command**: `npm run build`
4. **Publish directory**: `build`

### 3.3 Variables de entorno Netlify
En Netlify Dashboard > Site Settings > Environment variables:
- `REACT_APP_API_URL`: `https://[tu-railway-app].railway.app`

## 🔗 **Paso 4: Conectar servicios**

### 4.1 Actualizar CORS en backend
```javascript
const corsOptions = {
  origin: [
    'https://[tu-netlify-app].netlify.app',
    'http://localhost:3000'
  ],
  credentials: true
};
```

### 4.2 Actualizar frontend API URL
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://[tu-railway-app].railway.app';
```

## ✅ **Ventajas de esta solución:**
- 🆓 **Completamente gratuito**
- 🚀 **Deploy automático** desde GitHub
- 🔒 **SSL incluido** en ambas plataformas
- 🌍 **CDN global** con Netlify
- 🔄 **Auto-scaling** con Railway
- 📊 **Mantiene conexión** con tu MySQL Azure

## 📝 **Próximos pasos:**
1. Crear archivos de configuración
2. Push cambios a GitHub
3. Configurar Railway
4. Configurar Netlify
5. Probar conexión completa