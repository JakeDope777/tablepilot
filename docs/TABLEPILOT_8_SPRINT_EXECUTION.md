# TablePilot 8-Sprint Execution (Hard-Replace Fork)

## Status Snapshot (2026-03-09)

- Fork workspace: `/Users/jakedope/Documents/Playground/tablepilot-ai`
- Brand locked: `TablePilot`
- Primary product surface is restaurant-first (Control Tower, Margin Brain, Inventory & Waste, Manager Chat)
- Canonical demo artifact: `demo/tablepilot-pilot-demo.html`
- Legacy marketing backend APIs retained as deprecated compatibility only

## Sprint Completion Map

### Sprint 1: Platform Separation and Rebrand
- Completed: top-level identity rewritten to TablePilot in root docs and active UI surfaces.
- Pending: attach dedicated remote origin for this fork.

### Sprint 2: Data Ingestion and Validation
- Completed: CSV ingestion endpoints, row-level errors, idempotency keys.

### Sprint 3: Control Tower Intelligence
- Completed: daily KPIs, anomaly detection, venue threshold settings, recommendations.

### Sprint 4: Margin and Menu Engine
- Completed: margin analysis, menu engineering, repricing, price scenario simulator.

### Sprint 5: Inventory and Procurement Automation
- Completed: waste/variance alerts, supplier risk scoring, auto-order and PO approval workflow.

### Sprint 6: Labor and Service Optimization
- Completed: labor forecast, labor optimizer, role productivity metrics, shift templates.

### Sprint 7: Reputation and CRM Loop
- Completed: review ingestion, win-back playbook, campaign outcome and performance tracking.

### Sprint 8: Pilot Hardening and Launch Ops
- Completed: regression test gates, build gates, observability summary endpoint, smoke script.
- Pending: final remote publish step and latest preview URL handoff.

## Acceptance Scope (TablePilot)

- Frontend primary routes:
  - `/app/control-tower`
  - `/app/margin-brain`
  - `/app/inventory-waste`
  - `/app/manager-chat`
- Backend primary contract: `/restaurant/*`
- Legacy endpoints: operational but deprecated and out of acceptance scope.
