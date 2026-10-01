#!/usr/bin/env bash
# Local staging copy of the database: a fresh Postgres 16 cluster with the
# Supabase shim, every migration in supabase/migrations in order, and the seed.
# Usage: scripts/staging-db/up.sh [data-dir]   then: psql -h localhost -p 54329 -U postgres program
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DATA="${1:-${TMPDIR:-/tmp}/program-staging-db}"
PORT="${PGPORT_STAGING:-54329}"
BIN=/usr/lib/postgresql/16/bin
RUNAS=()
if [ "$(id -u)" = 0 ]; then RUNAS=(su postgres -s /bin/bash -c); fi
run() { if [ ${#RUNAS[@]} -gt 0 ]; then "${RUNAS[@]}" "$*"; else bash -c "$*"; fi; }

if [ -f "$DATA/postmaster.pid" ]; then run "$BIN/pg_ctl -D '$DATA' -m fast stop" || true; fi
rm -rf "$DATA"; mkdir -p "$DATA"; chown postgres "$DATA" 2>/dev/null || true
run "$BIN/initdb -D '$DATA' -U postgres --auth=trust >/dev/null"
run "$BIN/pg_ctl -D '$DATA' -o '-p $PORT -k /tmp' -l '$DATA/log' start >/dev/null"
for i in $(seq 1 30); do pg_isready -h /tmp -p "$PORT" -q && break; sleep 0.5; done
PSQL=(psql -h /tmp -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -d postgres -c "create database program"
"${PSQL[@]}" -d program -f "$ROOT/scripts/staging-db/supabase-shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "migrate $(basename "$f")"
  "${PSQL[@]}" -d program -f "$f"
done
echo "seed"
"${PSQL[@]}" -d program -f "$ROOT/supabase/seed/seed.sql"
echo "ready: psql -h /tmp -p $PORT -U postgres program"
