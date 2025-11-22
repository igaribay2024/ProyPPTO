# 🚀 Guía Completa de Migración a Vercel

## 📋 **Resumen de la Migración:**
- **Frontend**: Next.js/React en Vercel
- **Backend**: Vercel Serverless Functions (Node.js)
- **Base de datos**: Tu MySQL Azure existente
- **Deploy**: Automático desde GitHub

## 🏗️ **Arquitectura Vercel:**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│  React Frontend │────│ Vercel Functions │────│ MySQL Azure         │
│  (Static Site)  │    │  (API Backend)   │    │ mysql-presupuesto.. │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

## 🔧 **Paso 1: Reestructurar Backend como Functions**

### 1.1 Crear estructura de Vercel Functions
```
/api
  ├── auth/
  │   ├── login.js
  │   └── register.js
  ├── gastos/
  │   ├── index.js
  │   ├── [id].js
  │   └── create.js
  ├── presupuestos/
  │   ├── index.js
  │   ├── [id].js
  │   └── create.js
  └── users/
      ├── index.js
      └── [id].js
```

### 1.2 Configuración de base de datos para Vercel
```javascript
// /lib/database.js
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306,
  ssl: {
    rejectUnauthorized: false
  }
};

export async function getConnection() {
  return await mysql.createConnection(dbConfig);
}
```

## ⚙️ **Paso 2: Crear Vercel Functions**

### 2.1 Ejemplo de Function para login
```javascript
// /api/auth/login.js
import { getConnection } from '../../lib/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;
    const connection = await getConnection();
    
    const [rows] = await connection.execute(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }
    
    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    await connection.end();
    
    res.status(200).json({
      message: 'Login exitoso',
      token,
      user: { id: user.id, email: user.email, nombre: user.nombre }
    });
    
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}
```

## 🎨 **Paso 3: Configurar Frontend**

### 3.1 Actualizar configuración de API
```javascript
// /src/services/api.js
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-vercel-app.vercel.app'
  : 'http://localhost:3000';

export const api = {
  baseURL: `${API_BASE_URL}/api`
};
```

### 3.2 Crear vercel.json
```json
{
  "functions": {
    "api/**/*.js": {
      "runtime": "nodejs18.x"
    }
  },
  "env": {
    "DB_HOST": "mysql-presupuesto.mysql.database.azure.com",
    "DB_USER": "rootppto",
    "DB_NAME": "presupuesto_db",
    "DB_PORT": "3306"
  },
  "build": {
    "env": {
      "REACT_APP_API_URL": "https://your-vercel-app.vercel.app"
    }
  }
}
```

## 🚀 **Paso 4: Variables de Entorno Vercel**

En Vercel Dashboard → Settings → Environment Variables:
```
DB_HOST=mysql-presupuesto.mysql.database.azure.com
DB_USER=rootppto
DB_PASSWORD=[tu-password]
DB_NAME=presupuesto_db
DB_PORT=3306
JWT_SECRET=[tu-jwt-secret]
NODE_ENV=production
```

## 📦 **Paso 5: Deploy a Vercel**

### 5.1 Conectar repositorio
1. Ve a https://vercel.com
2. Inicia sesión con GitHub
3. Import repository: `ProyPPTO`
4. Framework: `Create React App`
5. Root directory: `/` (raíz del proyecto)

### 5.2 Configuración de build
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install`

## ✅ **Ventajas de esta migración:**
- 🚀 **Deploy automático** con cada push
- 🆓 **Completamente gratuito**
- ⚡ **Serverless** - escala automáticamente
- 🔒 **SSL incluido**
- 🌍 **CDN global**
- 📊 **Analytics incluido**
- 🔧 **Fácil configuración**

## 📝 **Próximos pasos:**
1. Reestructurar backend como Vercel Functions
2. Actualizar frontend para usar Functions
3. Configurar variables de entorno
4. Deploy a Vercel
5. Probar conexión completa