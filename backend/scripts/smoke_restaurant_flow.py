"""Smoke test for TablePilot restaurant week-1 flow.

Usage:
  cd backend
  DATABASE_URL=sqlite:///./test_data/smoke.db MEMORY_BASE_PATH=./test_memory python3 scripts/smoke_restaurant_flow.py
"""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
import sys

from fastapi.testclient import TestClient

# Allow running as a plain script from backend/scripts.
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.main import app


def _upload(client: TestClient, path: str, body: str) -> int:
    response = client.post(path, files={"file": ("data.csv", BytesIO(body.encode("utf-8")), "text/csv")})
    return response.status_code


def main() -> int:
    pos = (
        "date,menu_item,quantity,net_sales,covers,channel,forecast_revenue\n"
        "2026-03-10,Burger,12,228,24,in_store,250\n"
    )
    purchases = (
        "date,item_name,quantity,unit_cost,total_cost,supplier,on_hand_qty,par_level,waste_qty,theoretical_usage,actual_usage\n"
        "2026-03-10,Beef,30,6,180,Supplier A,6,15,2,10,14\n"
    )
    labor = (
        "date,staff_name,role,hours_worked,hourly_rate,labor_cost\n"
        "2026-03-10,Alice,server,8,18,144\n"
    )

    with TestClient(app) as client:
        status = {
            "pos_ingest": _upload(client, "/restaurant/ingest/pos-csv", pos),
            "purchases_ingest": _upload(client, "/restaurant/ingest/purchases-csv", purchases),
            "labor_ingest": _upload(client, "/restaurant/ingest/labor-csv", labor),
        }

        summary = client.get("/restaurant/control-tower/daily", params={"date": "2026-03-10"})
        recommendations = client.get("/restaurant/recommendations/daily", params={"date": "2026-03-10"})
        chat = client.post("/chat", json={"message": "What should I reorder tomorrow?"})

        status.update(
            {
                "control_tower": summary.status_code,
                "recommendations": recommendations.status_code,
                "chat": chat.status_code,
            }
        )

        print("Smoke status:", status)
        print("Control tower revenue:", summary.json().get("kpis", {}).get("revenue"))
        print("Recommendation count:", len(recommendations.json().get("recommendations", [])))
        print("Chat module:", chat.json().get("module_used"))

        expected_ok = all(code == 200 for code in status.values())
        return 0 if expected_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
