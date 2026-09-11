#!/usr/bin/env bash
# Uruchamia sam frontend (port 3000) w trybie dev, tak jak
# "pnpm --filter @expence/frontend dev". Zatrzymanie: Ctrl+C albo stop-frontend.sh.
#
# Port jest staly: AUTH_URL i NEXT_PUBLIC_WEB_URL (CORS backendu) w .env
# wskazuja na :3000, wiec inny port i tak zepsulby logowanie.
# Frontend bez backendu wstanie, ale logowanie i dane beda zwracac bledy -
# backend odpala start-backend.sh.
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Brak pliku .env w korzeniu repo - skopiuj .env.example (patrz CLAUDE.md, Bootstrap)" >&2
  exit 1
fi

exec pnpm --filter @expence/frontend dev
