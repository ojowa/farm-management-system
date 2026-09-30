FROM node:20

WORKDIR /app/farm-server

COPY farm-server/package.json farm-server/package-lock.json ./
COPY farm-server/app-server/package.json ./app-server/
COPY farm-server/packages/server/auth/package.json ./packages/server/auth/
COPY farm-server/packages/server/database/package.json ./packages/server/database/
COPY farm-server/packages/server/domain-core/package.json ./packages/server/domain-core/
COPY farm-server/packages/server/env/package.json ./packages/server/env/
COPY farm-server/packages/server/types/package.json ./packages/server/types/
COPY farm-server/packages/server/utils/package.json ./packages/server/utils/
COPY farm-server/packages/server/validation/package.json ./packages/server/validation/

RUN npm ci

COPY . /app

RUN npx prisma generate --schema packages/server/database/prisma/schema.prisma

RUN npm run build

ENV NODE_ENV=production

EXPOSE 4022

CMD ["node", "scripts/start-prod.js"]
