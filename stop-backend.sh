#!/usr/bin/env bash
# Zatrzymuje backend (domyslnie port 3001), tak jak Ctrl+C po odpaleniu
# "pnpm dev" / "pnpm --filter @expence/backend dev". Logika w stop-port.sh.
exec "$(dirname "$0")/stop-port.sh" "${1:-3001}" backend
