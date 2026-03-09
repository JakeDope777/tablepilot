# Digital CMO AI - Connector Marketplace Plan (Session `019cc37f-3ed5-73d3-aa5b-a69e18bceb02`)

Date: 2026-03-07  
Branch: `codex/restart-work`

## 1) Current Baseline (Completed)

- Backend integration API is wired in `main.py`:
  - `GET /integrations/catalog`
  - `GET /integrations/marketplace`
  - `GET /integrations/marketplace/stats`
  - `POST /integrations/{name}/connect|test|action`
  - `GET /integrations/{name}/status`
- Native connector set includes 21 integrations, with `n8n` as one connector.
- Marketplace snapshot added from n8n integration catalog:
  - source total: `1411` connectors
  - local snapshot: `200` connectors for fast demo rendering
- Front demo (`demo/investor-pitch-demo.html`) now pulls live backend marketplace data and supports search/filtering.

## 2) Product Direction (Corrected)

`n8n` is one connector and orchestration option, not the whole platform.  
Primary goal: build a multi-provider connector marketplace UX with 200+ visible connectors and consistent connect/test/run flows.

## 3) Next Build Phases

### Phase A - Marketplace Model v2 (Immediate)

1. Normalize connector metadata shape across all sources:
   - `provider`, `slug`, `display_name`, `category`, `auth_type`, `status`
2. Add provider-aware marketplace APIs:
   - `GET /integrations/marketplace/providers`
   - `GET /integrations/marketplace/connectors?provider=&category=&search=&limit=`
3. Keep compatibility aliases for existing n8n endpoints while moving frontend to generic marketplace routes only.

### Phase B - Frontend Demo Upgrade (Immediate)

1. Add filter chips:
   - provider (`native`, `n8n`, future providers)
   - category (`crm`, `ads`, `analytics`, `commerce`, `automation`)
2. Add connector detail drawer:
   - auth requirements
   - supported actions
   - sample payload
3. Add one-click demo run:
   - call `/integrations/{name}/action`
   - display response + status badges in UI

### Phase C - Connector Execution Layer (Sprint 1)

1. Persist connector connections and runs:
   - `integration_connections`
   - `integration_runs`
2. Add stable action contract:
   - `action`, `payload`, `context`, `idempotency_key`
3. Add run observability:
   - status timeline
   - error payload (sanitized)
   - latency metrics

### Phase D - Scale Beyond First 200 (Sprint 2)

1. Add importer job for marketplace snapshots:
   - source: n8n catalog payload
   - update cadence: daily
2. Raise snapshot coverage:
   - 200 -> 500 -> 1000+
3. Add quality gates:
   - duplicate slug detection
   - missing metadata checks
   - stale snapshot alerting

## 4) Concrete Next Step (Start Now)

1. Implement provider/category filters in backend marketplace endpoint.
2. Wire those filters into the demo page UI controls.
3. Add connector details endpoint for richer frontend cards.
4. Add tests for filtered marketplace and details endpoint.

## 5) Success Criteria for Marketplace v1

- Demo shows 200+ connectors with fast search and provider/category filters.
- Native connectors and marketplace templates are visually separated but unified in one UI.
- `n8n` appears as one connector plus one provider source, not a special-case product path.
- Connect/test/action flows return consistent response schema.
- Backend tests remain fully passing with new marketplace endpoints.
