#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <BACKEND_URL> <FRONTEND_URL>"
  exit 1
fi

BACKEND_URL="${1%/}"
FRONTEND_URL="${2%/}"

echo "[1/8] Backend health"
curl -fsS "$BACKEND_URL/health" >/dev/null

echo "[2/8] Backend readiness"
curl -fsS "$BACKEND_URL/health/ready" >/dev/null

echo "[3/8] Billing health"
curl -fsS "$BACKEND_URL/billing/health" >/dev/null

echo "[4/8] Growth funnel summary"
curl -fsS "$BACKEND_URL/growth/funnel-summary?days=14" >/dev/null

echo "[5/8] Frontend landing"
curl -fsS "$FRONTEND_URL/" >/dev/null

echo "[6/8] Frontend login"
curl -fsS "$FRONTEND_URL/login" >/dev/null

echo "[7/8] Frontend register"
curl -fsS "$FRONTEND_URL/register" >/dev/null

echo "[8/8] Frontend verify-email"
curl -fsS "$FRONTEND_URL/verify-email" >/dev/null

echo "Smoke checks passed for:"
echo "- Backend: $BACKEND_URL"
echo "- Frontend: $FRONTEND_URL"
