# TablePilot AI

TablePilot is an AI operating partner for restaurant owners and managers.
It focuses on daily control, margin protection, inventory/waste reduction, and manager decision support.

## Product Surface (Pilot Alpha)

Primary in-app modules:
- `Control Tower`
- `Margin Brain`
- `Inventory & Waste`
- `Manager Chat`

Primary frontend routes:
- `/app/control-tower`
- `/app/margin-brain`
- `/app/inventory-waste`
- `/app/manager-chat`

## API Contract

Canonical APIs are under `/restaurant/*`, including:
- CSV ingestion (`/restaurant/ingest/*`)
- Daily KPIs (`/restaurant/control-tower/daily`)
- Margin and menu intelligence (`/restaurant/finance/margin`, `/restaurant/menu/*`)
- Inventory/procurement workflows (`/restaurant/inventory/*`, `/restaurant/procurement/*`)
- Recommendations and readiness (`/restaurant/recommendations/daily`, `/restaurant/ops/readiness`)

Legacy marketing endpoints (`/analysis`, `/creative`, `/crm`, `/analytics`, etc.) remain available only for compatibility and are **deprecated in this fork**.

## Local Run

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Default frontend API base is `http://localhost:8000`.

## Demo and Smoke Validation

Canonical demo artifact:
- `demo/tablepilot-pilot-demo.html`

Restaurant E2E smoke script:
```bash
cd backend
DATABASE_URL=sqlite:///./test_data/smoke.db MEMORY_BASE_PATH=./test_memory python3 scripts/smoke_restaurant_flow.py
```

Expected smoke flow:
1. ingest POS/purchases/labor CSV
2. fetch control tower daily summary
3. fetch daily recommendations
4. chat receives `module_used=restaurant_ops`

## Build and Test Gates

Backend:
```bash
cd backend
python3 -m pytest -q
```

Frontend:
```bash
cd frontend
npm run build
```

## Deployment

Preview deploys are used for pilot validation.

Project defaults:
- Brand: `TablePilot`
- Single-venue pilot first
- CSV + mock connectors for week-one ingestion
