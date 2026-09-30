FROM node:20

WORKDIR /app

COPY package.json package-lock.json ./
COPY app-server/package.json ./app-server/
COPY packages/server/auth/package.json ./packages/server/auth/
COPY packages/server/database/package.json ./packages/server/database/
COPY packages/server/domain-core/package.json ./packages/server/domain-core/
COPY packages/server/env/package.json ./packages/server/env/
COPY packages/server/types/package.json ./packages/server/types/
COPY packages/server/utils/package.json ./packages/server/utils/
COPY packages/server/validation/package.json ./packages/server/validation/

RUN npm ci

COPY . .

RUN npm run build

ENV NODE_ENV=production

EXPOSE 10000

CMD ["node", "scripts/start-prod.js"]
