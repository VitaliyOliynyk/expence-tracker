#!/usr/bin/env bash
# Zatrzymuje proces nasluchujacy na porcie backendu (domyslnie 3001),
# tak jak Ctrl+C po odpaleniu "pnpm dev" / "pnpm --filter @expence/backend dev".
set -euo pipefail

PORT="${1:-3001}"

PIDS=$(lsof -ti tcp:"$PORT" || true)

if [ -z "$PIDS" ]; then
  echo "Nic nie nasluchuje na porcie $PORT"
  exit 0
fi

echo "Zatrzymuje backend na porcie $PORT (PID: $PIDS)"
kill -INT $PIDS

for i in $(seq 1 10); do
  sleep 1
  PIDS=$(lsof -ti tcp:"$PORT" || true)
  if [ -z "$PIDS" ]; then
    echo "Zatrzymano"
    exit 0
  fi
done

echo "Proces nie zareagowal na SIGINT, wymuszam zamkniecie (SIGKILL)"
kill -9 $PIDS
