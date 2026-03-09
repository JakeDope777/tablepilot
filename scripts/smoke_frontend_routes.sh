#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
PORT="${PORT:-3017}"

cleanup() {
  if [[ -n "${DEV_PID:-}" ]] && kill -0 "$DEV_PID" 2>/dev/null; then
    kill "$DEV_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

cd "$FRONTEND_DIR"
npm run dev -- --host 127.0.0.1 --port "$PORT" >/tmp/tablepilot-frontend-smoke.log 2>&1 &
DEV_PID=$!
sleep 8

paths=(
  "/"
  "/login"
  "/register"
  "/app"
  "/app/control-tower"
  "/app/margin-brain"
  "/app/inventory-waste"
  "/app/manager-chat"
)

for p in "${paths[@]}"; do
  code=$(curl -s -o /tmp/tablepilot-route.out -w "%{http_code}" "http://127.0.0.1:${PORT}${p}")
  echo "$p -> $code"
  if [[ "$code" != "200" ]]; then
    echo "Route smoke failed for $p"
    exit 1
  fi
done

echo "Frontend route smoke passed."
