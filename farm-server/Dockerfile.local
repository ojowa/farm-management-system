# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY app-server/package.json ./app-server/
COPY packages/server/*/package.json ./packages/server/

RUN npm ci

COPY tsconfig.base.json ./
COPY app-server/tsconfig.json ./app-server/
COPY app-server/nest-cli.json ./
COPY packages/server/ ./packages/server/
COPY app-server/src/ ./app-server/src/

RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS production
WORKDIR /app

COPY package.json package-lock.json ./
COPY app-server/package.json ./app-server/
COPY packages/server/*/package.json ./packages/server/

RUN npm ci --omit=dev && npm cache clean --force

# Prune Prisma to PostgreSQL only (~30MB instead of ~150MB)
RUN npx prisma generate --no-engine 2>/dev/null; \
    rm -rf node_modules/.prisma/client/libquery_engine-debian-openssl-*.node.node 2>/dev/null; \
    rm -rf node_modules/.prisma/client/libquery_engine-windows.dll.node 2>/dev/null; \
    rm -rf node_modules/.prisma/client/libquery_engine-rhel-* 2>/dev/null; \
    rm -rf node_modules/.prisma/client/libquery_engine-darwin-* 2>/dev/null

COPY --from=builder /app/app-server/dist ./app-server/dist
COPY --from=builder /app/packages/server/*/dist ./packages/server/
COPY app-server/prisma ./app-server/prisma

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "app-server/dist/microservices/api.main.js"]
