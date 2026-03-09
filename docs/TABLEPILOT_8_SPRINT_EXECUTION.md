# TablePilot 8-Sprint Execution (Compressed Pilot Program)

## Status Snapshot (as of 2026-03-09)

- Project fork created: `/Users/jakedope/Documents/Playground/tablepilot-ai`
- Pilot preview deployed on Vercel (preview environment)
- Core restaurant pilot modules shipped:
  - Control Tower
  - Finance/Margin
  - Inventory/Waste
  - Manager Chat
- Extended operational endpoints shipped:
  - Portfolio rollup
  - Labor optimizer
  - Inventory auto-order draft
  - Menu repricing suggestions
  - Reputation win-back playbook
  - Ops readiness scoring

## Sprint Map

### Sprint 1: Platform Separation and Rebrand
- Done:
  - Migrated app identity to TablePilot in backend/frontend core surfaces
  - Added fork bootstrap script
- Next:
  - Rename legacy marketing modules and paths to neutral/internal naming
  - Move TablePilot repo to dedicated remote origin

### Sprint 2: Data Ingestion and Validation
- Done:
  - POS, purchases, labor, recipes, reviews ingestion endpoints
  - CSV validation and normalization paths
- Next:
  - Add structured ingestion error reports with row-level diagnostics
  - Add idempotency keys for repeated uploads

### Sprint 3: Control Tower Intelligence
- Done:
  - Daily KPI aggregation
  - Anomaly detection and recommendation generation
- Next:
  - Add configurable venue thresholds and anomaly sensitivity profiles

### Sprint 4: Margin and Menu Engine
- Done:
  - Margin by dish/channel
  - Menu engineering matrix
  - Repricing suggestions endpoint
- Next:
  - Add scenario simulator for price elasticity assumptions

### Sprint 5: Inventory and Procurement Automation
- Done:
  - Inventory alerts, variance detection
  - Procurement opportunities
  - Auto-order draft endpoint
- Next:
  - Add supplier SLA/risk scoring and PO approval workflow state

### Sprint 6: Labor and Service Optimization
- Done:
  - Labor forecast
  - Labor optimizer recommendation endpoint
  - Hire-check scenario endpoint
- Next:
  - Add role-level productivity metrics and shift templates

### Sprint 7: Reputation and CRM Loop
- Done:
  - Reviews ingestion
  - Weekly complaint clustering
  - Win-back playbook endpoint
- Next:
  - Add campaign execution connectors and outcome tracking

### Sprint 8: Pilot Hardening and Launch Ops
- Done:
  - Backend and frontend build/test gates green
  - Preview deployment workflow used successfully
- Next:
  - Add observability dashboard (error rate, API latency, ingestion health)
  - Add pilot runbook and rollback checklist

## Immediate Next Build Queue (Execution Order)

1. Row-level CSV error reporting (high impact on pilot onboarding)
2. Configurable KPI thresholds per venue
3. Idempotent ingestion keys and duplicate upload guards
4. Supplier SLA/risk score module
5. Observability health endpoint bundle for pilot operations
