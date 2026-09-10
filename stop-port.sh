#!/usr/bin/env bash
# Wspolna logika dla stop-backend.sh i stop-frontend.sh.
# Uzycie: stop-port.sh <port> <nazwa>
#
# Dlaczego nie lsof: pod WSL2 lsof 4.95 nie widzi gniazd procesow (nawet
# "lsof -p <pid>" nie pokazuje TCP), wiec zwracal pusta liste i skrypt
# konczyl sie komunikatem "nic nie nasluchuje" przy dzialajacym serwerze.
# ss/fuser czytaja /proc/net bezposrednio i dzialaja poprawnie.
#
# Dlaczego rodzic "next dev", a nie proces na porcie: na porcie slucha
# dziecko "next-server". Zabicie samego dziecka zostawia wiszacego rodzica
# "next dev" (nie restartuje go, ale tez sie nie konczy). SIGINT wyslany do
# rodzica przekazuje sygnal dziecku, czeka na nie i konczy oba - tak samo
# jak Ctrl+C w terminalu.
set -euo pipefail

PORT="${1:?Podaj port}"
NAME="${2:-serwer}"

# PID-y procesow, ktore NASLUCHUJA na porcie (bez klientow polaczonych z portem).
listen_pids() {
  local pids=""
  if command -v ss >/dev/null 2>&1; then
    pids=$(ss -Hltnp "sport = :$PORT" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u || true)
  fi
  if [ -z "$pids" ] && command -v fuser >/dev/null 2>&1; then
    pids=$(fuser "$PORT"/tcp 2>/dev/null | tr -s ' ' '\n' | grep -E '^[0-9]+$' || true)
  fi
  echo $pids
}

# Idzie w gore drzewa procesow i zwraca PID "next dev" (jesli jest), inaczej sam PID.
next_dev_parent() {
  local pid="$1" cur="$1" cmd
  while [ -n "$cur" ] && [ "$cur" -gt 1 ]; do
    cmd=$(tr '\0' ' ' < /proc/"$cur"/cmdline 2>/dev/null || true)
    if [[ "$cmd" == *"/next "*"dev"* || "$cmd" == *"/bin/next dev"* ]]; then
      echo "$cur"
      return
    fi
    cur=$(ps -o ppid= -p "$cur" 2>/dev/null | tr -d ' ' || true)
  done
  echo "$pid"
}

LISTENERS=$(listen_pids)

if [ -z "$LISTENERS" ]; then
  echo "Nic nie nasluchuje na porcie $PORT"
  exit 0
fi

TARGETS=""
for p in $LISTENERS; do
  TARGETS="$TARGETS $(next_dev_parent "$p")"
done
TARGETS=$(echo $TARGETS | tr ' ' '\n' | sort -u | tr '\n' ' ')

echo "Zatrzymuje $NAME na porcie $PORT (nasluchuje: $LISTENERS, sygnal do: $TARGETS)"
kill -INT $TARGETS 2>/dev/null || true

for _ in $(seq 1 10); do
  sleep 1
  if [ -z "$(listen_pids)" ]; then
    echo "Zatrzymano"
    exit 0
  fi
done

echo "Proces nie zareagowal na SIGINT, wymuszam zamkniecie (SIGKILL)"
kill -9 $TARGETS $(listen_pids) 2>/dev/null || true
sleep 1
if [ -n "$(listen_pids)" ]; then
  echo "Nie udalo sie zwolnic portu $PORT" >&2
  exit 1
fi
echo "Zatrzymano (SIGKILL)"
