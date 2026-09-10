#!/usr/bin/env bash
# Zatrzymuje frontend (domyslnie port 3000), tak jak Ctrl+C po odpaleniu
# "pnpm dev" / "pnpm --filter @expence/frontend dev". Logika w stop-port.sh.
exec "$(dirname "$0")/stop-port.sh" "${1:-3000}" frontend
