#!/usr/bin/env bash
# Uruchamia sam backend (port 3001) w trybie dev, tak jak
# "pnpm --filter @expence/backend dev". Zatrzymanie: Ctrl+C albo stop-backend.sh.
#
# Port jest staly: NEXT_PUBLIC_API_URL i API_URL w .env wskazuja na :3001.
# Backend bez bazy wstaje, ale kazde zapytanie konczy sie bledem, dlatego
# najpierw podnosimy kontener Postgresa ("pnpm db:up") i czekamy na jego
# healthcheck. Dziala tez, gdy kontener juz chodzi - wtedy nic nie zmienia.
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Brak pliku .env w korzeniu repo - skopiuj .env.example (patrz CLAUDE.md, Bootstrap)" >&2
  exit 1
fi

echo "Uruchamiam Postgresa (docker compose) i czekam na healthcheck..."
docker compose up -d --wait

exec pnpm --filter @expence/backend dev
