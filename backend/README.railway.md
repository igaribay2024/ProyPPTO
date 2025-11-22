# Railway Deployment Package

Este package está configurado para deployment en Railway.app

## Variables de entorno requeridas:
- DB_HOST: mysql-presupuesto.mysql.database.azure.com
- DB_USER: rootppto
- DB_PASSWORD: [configurar en Railway dashboard]
- DB_NAME: presupuesto_db
- DB_SSL_ENABLED: true
- PORT: 3000
- JWT_SECRET: [configurar en Railway dashboard]
- FRONTEND_URL: [URL de Netlify]

## Deploy:
1. Conecta este repositorio a Railway
2. Configura las variables de entorno
3. Railway detectará automáticamente Node.js y ejecutará npm install + npm start