# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web

RUN npx prisma generate --schema=apps/api/prisma/schema.prisma \
  && npm run build -w @vaya/shared \
  && npm run build -w @vaya/api \
  && npm run build -w @vaya/web \
  && mkdir -p public \
  && cp -R apps/web/dist/. public/

# Production deps only (Prisma client stays in node_modules)
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 1001 --create-home nodejs

ENV NODE_ENV=production \
    PORT=3000 \
    WEB_DIST=/app/public \
    UPLOAD_DIR=/data/uploads

COPY --from=build --chown=nodejs:nodejs /app/package.json /app/package-lock.json ./
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/public ./public
COPY --from=build --chown=nodejs:nodejs /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=nodejs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=nodejs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=nodejs:nodejs /app/apps/api/prisma ./apps/api/prisma

RUN mkdir -p /data/uploads && chown -R nodejs:nodejs /data

USER nodejs
EXPOSE 3000

# Fly release_command runs migrations; this is a safe fallback for plain docker run
CMD ["sh", "-c", "npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma && node apps/api/dist/main.js"]
