# Dockerfile para MyKaizenFit Frontend
FROM node:18-alpine AS base

# Instalar dependencias solo cuando sea necesario
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Instalar dependencias usando npm (lockfile oficial del proyecto)
# Usar --prefer-offline para usar caché local si existe
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --prefer-offline --no-audit --progress=false

# Rebuild del código fuente solo cuando sea necesario
FROM base AS builder
WORKDIR /app

# Copiar node_modules primero (capa que cambia menos)
COPY --from=deps /app/node_modules ./node_modules

# Variables de entorno para build (ANTES de copiar código)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Limitar memoria de Node.js durante el build (1.5GB máximo para evitar colgar el servidor)
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Build arg para el archivo de entorno (por defecto producción)
ARG ENV_FILE=docker.env.production

# Copiar package.json primero
COPY package.json package-lock.json ./

# Copiar código fuente (incluye docker.env* si existen)
COPY . .

# Seleccionar y copiar el archivo correcto según el build arg
# Priorizar docker.env.production para producción
RUN set -e; \
    if [ -n "$ENV_FILE" ] && [ "$ENV_FILE" != "docker.env.production" ] && [ -f "$ENV_FILE" ]; then \
      cp "$ENV_FILE" .env.production && echo "✓ Using $ENV_FILE"; \
    elif [ -f "docker.env.production" ]; then \
      cp docker.env.production .env.production && echo "✓ Using docker.env.production"; \
    elif [ -f "docker.env" ]; then \
      cp docker.env .env.production && echo "✓ Using docker.env (fallback)"; \
    else \
      echo "⚠ Warning: No env file found, creating empty .env.production"; \
      touch .env.production; \
    fi

# Build de la aplicación con optimizaciones
RUN chmod +x node_modules/.bin/next || true
# Limpiar caché de npm antes del build para ahorrar memoria
RUN npm cache clean --force || true
# Build con menos workers para reducir consumo de CPU/memoria
RUN npm run build || (echo "Build failed, cleaning up..." && rm -rf .next && exit 1)

# Imagen de producción, copiar todos los archivos y ejecutar next
FROM base AS runner
WORKDIR /app

# Instalar wget para healthchecks
RUN apk add --no-cache wget

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Configurar correctamente los permisos para prerender
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copiar archivos de build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]


















