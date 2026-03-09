# MVP Launch Checklist (Pilot-Ready)

## Environment
- [ ] Render backend deployed and healthy at `/health/ready`
- [ ] Vercel frontend deployed and pointing `VITE_API_URL` to Render API
- [ ] Postgres connected (`DATABASE_URL` set in Render)
- [ ] `SECRET_KEY` set to strong generated value
- [ ] `CORS_ORIGINS_CSV` set to frontend production domain

## Auth + Email
- [ ] SMTP configured (`SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`)
- [ ] Signup works end-to-end
- [ ] Forgot password email arrives with reset link
- [ ] Reset password flow completes and user can login
- [ ] Email verification link works (`/verify-email?token=...`)

## Billing (Stripe Test Mode)
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` configured
- [ ] Stripe test products/prices created (`STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_ENTERPRISE_MONTHLY`)
- [ ] Billing readiness endpoint healthy (`GET /billing/health`)
- [ ] Checkout session opens from billing page
- [ ] Webhook endpoint receives events (`/billing/webhook`)
- [ ] Webhook replay is idempotent (duplicate event is ignored)
- [ ] Subscription status reflects in billing UI
- [ ] Invoice list renders for test invoices

## Growth + Hypothesis Testing
- [ ] `POSTHOG_API_KEY` configured
- [ ] `VITE_GA_MEASUREMENT_ID` configured
- [ ] Funnel summary endpoint healthy (`GET /growth/funnel-summary?days=14`)
- [ ] Landing view, signup_started/completed, verification_completed events captured
- [ ] onboarding_completed, dashboard_viewed, analysis_run, chat_message_sent captured
- [ ] checkout_started/completed captured
- [ ] Waitlist form creates `waitlist_leads` records with UTM params

## Product QA
- [ ] Mobile nav works on `/app/*`
- [ ] Login, register, forgot/reset, verify pages render on mobile + desktop
- [ ] Dashboard, profile, billing fail gracefully when API errors
- [ ] Core flow under 5 minutes: signup -> verify -> dashboard -> first analysis/chat action
