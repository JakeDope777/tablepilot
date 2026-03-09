# Deployment Activation Guide (Vercel + Render)

## Target
- Frontend: Vercel
- Backend: Render
- Database: Render Postgres

## 1) Render Backend Activation
1. Create service from `render.yaml`.
2. Set real env values:
- `FRONTEND_BASE_URL`
- `CORS_ORIGINS_CSV`
- `SECRET_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_ENTERPRISE_MONTHLY`
- SMTP variables
- `POSTHOG_API_KEY`
3. Deploy and confirm:
- `GET /health`
- `GET /health/ready`
- `GET /billing/health`
- `GET /growth/funnel-summary?days=14`

## 2) Vercel Frontend Activation
1. Import `frontend/` project to Vercel.
2. Set env values:
- `VITE_API_URL=https://<render-backend-domain>`
- `VITE_APP_URL=https://<vercel-domain>`
- `VITE_GA_MEASUREMENT_ID`
- `VITE_POSTHOG_KEY`
- `VITE_POSTHOG_HOST`
3. Deploy and confirm routes:
- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/verify-email`
- `/app/dashboard`

## 3) Stripe Webhook Activation
1. In Stripe test mode, set webhook endpoint to:
- `https://<render-backend-domain>/billing/webhook`
2. Subscribe events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.finalized`
3. Confirm idempotency:
- replay one event in Stripe dashboard
- second delivery should be ignored as duplicate

## 4) Smoke Command
Run from repo root:
```bash
./scripts/smoke_check.sh https://<render-backend-domain> https://<vercel-domain>
```

Or run GitHub Actions workflow:
- Workflow: `Deploy Smoke Check`
- Inputs:
  - `backend_url`
  - `frontend_url`

## 5) Demo URL Output
After successful deploy, record:
- Backend URL: `https://<render-backend-domain>`
- Frontend demo URL: `https://<vercel-domain>`
