#!/usr/bin/env bash
# Run ON THE VPS from the project directory (after git clone).
# Requires: docker + docker compose plugin, .env (from .env.production.example)
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Missing .env — copy .env.production.example to .env and fill it in." >&2
  exit 1
fi

# Optional: run a prebuilt image from GHCR instead of building locally
#   export VAYA_IMAGE=ghcr.io/<owner>/<repo>:<tag>
#   docker pull "$VAYA_IMAGE"
# then skip --build below (compose will use $VAYA_IMAGE).

echo "==> Building and starting stack"
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Applying Prisma migrations"
docker compose -f docker-compose.prod.yml exec -T api \
  npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

echo "==> Health check"
sleep 2
curl -fsS "http://127.0.0.1:3000/api/v1/health" || true
echo
echo "Done. App should be available via https://\$SITE_NAME"
