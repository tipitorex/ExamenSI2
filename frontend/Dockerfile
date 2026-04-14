# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY frontend/package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY frontend/src ./src
COPY frontend/angular.json ./
COPY frontend/tsconfig.* ./

# Builds la aplicación
RUN npm run build -- --configuration production

# Stage 2: Serve
FROM nginx:alpine

# Copiar configuración nginx desde archivo
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build desde builder stage (Angular 17+ genera en /browser/)
COPY --from=builder /app/dist/app-talleres/browser /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
