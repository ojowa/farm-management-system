# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app

# Install system dependencies for Prisma
RUN apk add --no-cache openssl libc6-compat

# ---- Dependencies stage ----
FROM base AS deps
WORKDIR /app

# Copy root package files
COPY package.json ./
COPY package-lock.json* ./

# Copy server package files
COPY farm-server/package.json ./farm-server/
COPY farm-server/package-lock.json* ./farm-server/

# Copy workspace package files
COPY farm-server/packages/server/*/package.json ./farm-server/packages/server/*/

# Install dependencies
RUN npm install --prefer-offline --frozen-lockfile

# ---- Build stage ----
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/farm-server/node_modules ./farm-server/node_modules
COPY --from=deps /app/farm-server/packages/server/*/node_modules ./farm-server/packages/server/*/node_modules/

# Copy Prisma schema and migrations
COPY farm-server/packages/server/database/prisma ./farm-server/packages/server/database/prisma

# Copy source code
COPY farm-server/ ./farm-server/

# Generate Prisma client
WORKDIR /app/farm-server/packages/server/database
RUN npx prisma generate --schema=prisma/schema.prisma

# Build all NestJS services
WORKDIR /app/farm-server/app-server
RUN npm run build

# ---- Run stage ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/farm-server/app-server/dist ./farm-server/app-server/dist
COPY --from=builder /app/farm-server/app-server/node_modules ./farm-server/app-server/node_modules
COPY --from=builder /app/farm-server/packages/server/database/node_modules/.prisma ./farm-server/packages/server/database/node_modules/.prisma
COPY --from=builder /app/farm-server/packages/server/database/prisma ./farm-server/packages/server/database/prisma

EXPOSE 3000

CMD ["node", "farm-server/app-server/dist/microservices/api.main"]
