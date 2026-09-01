# ==============================================================================
# GREENSCAPE PRO PROPOSAL INTELLIGENCE AGENT - DOCKERFILE
# Multi-stage production container build (Vite SPA + Express Backend)
# Target Architecture: Linux amd64/arm64 (Cloud Run, Kubernetes, ECS)
# ==============================================================================

# STAGE 1: Dependency & Build Base
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source code & configuration
COPY tsconfig*.json vite.config.ts index.html ./
COPY src/ ./src/
COPY server/ ./server/
COPY server.ts ./
COPY public/ ./public/

# Build client SPA and bundled backend
ENV NODE_ENV=production
RUN npm run build

# STAGE 2: Lightweight Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Security: Run as unprivileged user
RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

ENV NODE_ENV=production
ENV PORT=3000

# Install production-only dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled artifacts from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy database migrations for automated migrations at container startup
COPY --chown=nodejs:nodejs migrations/ ./migrations/

USER nodejs

EXPOSE 3000

# Safe health check definition
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

# Production start command
CMD ["node", "dist/server.cjs"]
