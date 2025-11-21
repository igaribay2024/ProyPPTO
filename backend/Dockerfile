# Dockerfile para Backend Node.js
FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Copiar certificado SSL de MySQL Azure
COPY MysqlflexGlobalRootCA.crt.pem ./

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S altexapi -u 1001

# Cambiar permisos
RUN chown -R altexapi:nodejs /app
USER altexapi

# Exponer puerto
EXPOSE 80

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=80

# Comando de inicio
CMD ["npm", "start"]