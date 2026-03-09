# TablePilot Pilot Runbook

## Canonical Demo Artifact

- `demo/tablepilot-pilot-demo.html`

## Validation Checklist

1. Backend tests
```bash
cd backend
python3 -m pytest -q
```

2. Frontend production build
```bash
cd frontend
npm run build
```

3. Frontend route smoke
```bash
./scripts/smoke_frontend_routes.sh
```

4. Restaurant flow smoke
```bash
cd backend
DATABASE_URL=sqlite:///./test_data/smoke.db MEMORY_BASE_PATH=./test_memory python3 scripts/smoke_restaurant_flow.py
```

## Legacy Compatibility Policy

- `/restaurant/*` is canonical for TablePilot.
- Legacy marketing APIs remain enabled temporarily for compatibility only.
- Legacy APIs are out of pilot acceptance scope.
