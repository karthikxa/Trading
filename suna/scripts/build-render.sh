#!/usr/bin/env bash
set -e

echo "==> Ensuring build dependencies (Bun & pnpm)..."
(command -v bun >/dev/null 2>&1 || (export BUN_INSTALL="$PWD/.bun" && curl -fsSL https://bun.sh/install | bash))
(command -v pnpm >/dev/null 2>&1 || corepack enable || npm install -g pnpm@10)

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile --prod=false

echo "==> Running frontend pre-build scripts..."
(cd apps/web && node scripts/validate-production-supabase-env.mjs && node scripts/copy-viewer-wasm.mjs && node scripts/copy-emojibase-data.mjs && node scripts/generate-fumadocs-source.mjs)

echo "==> Building Next.js standalone application with all pages..."
NODE_OPTIONS="--max-old-space-size=2048" \
RAYON_NUM_THREADS=1 \
TOKIO_WORKER_THREADS=1 \
UV_THREADPOOL_SIZE=2 \
MALLOC_ARENA_MAX=2 \
KORTIX_TURBOPACK_EVICTION=full \
NEXT_TELEMETRY_DISABLED=1 \
pnpm --filter Kortix-Computer-Frontend exec next build --debug-build-paths="app/**/page.tsx,app/**/route.ts"

echo "==> Staging standalone static and public assets..."
mkdir -p apps/web/.next/standalone/apps/web/.next apps/web/.next/standalone/apps/web/public
cp -R apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
cp -R apps/web/public/. apps/web/.next/standalone/apps/web/public/

echo "==> Render build completed successfully!"
