#!/usr/bin/env bash
set -e

BUN_BIN="$(command -v bun || echo "$PWD/.bun/bin/bun")"
(cd apps/api && PORT=8008 "$BUN_BIN" --smol --no-env-file --max-http-header-size=65536 run src/trading/lean-server.ts) &

i=0
while [ "$i" -lt 30 ]; do
  if node -e "fetch('http://127.0.0.1:8008/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    break
  fi
  i=$((i+1))
  sleep 1
done

export PORT="${PORT:-10000}"
export HOSTNAME=0.0.0.0
export NODE_OPTIONS="--max-old-space-size=300"
exec node apps/web/.next/standalone/apps/web/server.js
