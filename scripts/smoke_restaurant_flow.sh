#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <BACKEND_URL>"
  exit 1
fi

BACKEND_URL="${1%/}"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

cat > "$WORK_DIR/pos.csv" <<'CSV'
date,menu_item,quantity,net_sales,covers,channel,forecast_revenue
2026-03-09,Burger,10,180,20,in_store,240
2026-03-09,Steak,6,210,10,in_store,260
CSV

cat > "$WORK_DIR/purchases.csv" <<'CSV'
date,item_name,quantity,unit_cost,total_cost,supplier,on_hand_qty,par_level,waste_qty,theoretical_usage,actual_usage
2026-03-09,Beef,25,6,150,Supplier A,8,15,2,12,16
2026-03-09,Bread,30,0.8,24,Supplier A,12,10,0,8,7
2026-03-07,Beef,20,5,100,Supplier A,20,15,1,10,9
CSV

cat > "$WORK_DIR/labor.csv" <<'CSV'
date,staff_name,role,hours_worked,hourly_rate,labor_cost,scheduled_covers
2026-03-09,Alice,server,8,18,144,35
2026-03-09,Bob,cook,9,20,180,35
CSV

cat > "$WORK_DIR/reviews.csv" <<'CSV'
date,rating,text,source
2026-03-09,3,Service was slower than usual,google
2026-03-09,5,Great burgers and team,google
CSV

echo "[1/8] ingest POS"
curl -fsS -X POST "$BACKEND_URL/restaurant/ingest/pos-csv" -F "file=@$WORK_DIR/pos.csv" >/tmp/tp-pos.json

echo "[2/8] ingest purchases"
curl -fsS -X POST "$BACKEND_URL/restaurant/ingest/purchases-csv" -F "file=@$WORK_DIR/purchases.csv" >/tmp/tp-purchases.json

echo "[3/8] ingest labor"
curl -fsS -X POST "$BACKEND_URL/restaurant/ingest/labor-csv" -F "file=@$WORK_DIR/labor.csv" >/tmp/tp-labor.json

echo "[4/8] ingest reviews"
curl -fsS -X POST "$BACKEND_URL/restaurant/ingest/reviews-csv" -F "file=@$WORK_DIR/reviews.csv" >/tmp/tp-reviews.json

echo "[5/8] ingest recipes"
curl -fsS -X POST "$BACKEND_URL/restaurant/ingest/recipes" \
  -H 'Content-Type: application/json' \
  -d '{"recipes":[{"dish_name":"Burger","selling_price":18,"ingredients":[{"name":"Beef","quantity":0.25,"unit_cost":6},{"name":"Bread","quantity":1,"unit_cost":0.8}]},{"dish_name":"Steak","selling_price":35,"ingredients":[{"name":"Beef","quantity":0.4,"unit_cost":6}]}]}' >/tmp/tp-recipes.json

echo "[6/8] control tower"
curl -fsS "$BACKEND_URL/restaurant/control-tower/daily?date=2026-03-09" >/tmp/tp-control.json

echo "[7/8] recommendations"
curl -fsS "$BACKEND_URL/restaurant/recommendations/daily?date=2026-03-09" >/tmp/tp-recs.json

echo "[8/8] manager chat"
curl -fsS -X POST "$BACKEND_URL/chat" \
  -H 'Content-Type: application/json' \
  -d '{"message":"Why was profit weak last week and what should I reorder tomorrow?"}' >/tmp/tp-chat.json

python3 - <<'PY'
import json
from pathlib import Path

control = json.loads(Path('/tmp/tp-control.json').read_text())
recs = json.loads(Path('/tmp/tp-recs.json').read_text())
chat = json.loads(Path('/tmp/tp-chat.json').read_text())

assert 'kpis' in control, 'Missing kpis in control tower response'
assert isinstance(recs.get('recommendations'), list) and recs['recommendations'], 'Expected recommendations list'
assert chat.get('module_used') == 'restaurant_ops', f"Unexpected module_used: {chat.get('module_used')}"
assert chat.get('reply'), 'Expected non-empty chat reply'

print('E2E smoke passed: ingest -> control tower -> recommendations -> chat')
PY
