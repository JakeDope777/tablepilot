# Release Runbook (MVP)

## 1) Pre-deploy
1. Ensure backend migrations are applied.
2. Confirm required env vars are set on Render and Vercel.
   - Run `./scripts/validate_deploy_env.py` with target env vars exported.
3. Verify Stripe test keys and webhook signing secret.
4. Verify SMTP credentials by sending a test verification email.

## 2) Deploy sequence
1. Deploy backend to Render.
2. Validate backend:
   - `GET /health`
   - `GET /health/ready`
   - `GET /docs`
3. Deploy frontend to Vercel.
4. Validate frontend routes:
   - `/`
   - `/login`
   - `/register`
   - `/forgot-password`
   - `/verify-email`
   - `/app/dashboard`

## 3) Smoke tests
0. Run `./scripts/smoke_check.sh https://<backend-url> https://<frontend-url>`
1. Signup user -> verification email -> verify.
2. Login and open dashboard.
3. Send one chat message and run one analysis.
4. Update profile and reload page.
5. Open billing page, start test checkout.
6. Confirm Stripe webhook updates subscription/invoice data.
7. Submit waitlist form on landing page.

## 4) Monitoring and rollback
1. Watch Render logs for 5xx and webhook errors.
2. Watch Vercel logs for route/runtime errors.
3. If critical break:
   - Roll back frontend to previous Vercel deployment.
   - Roll back backend to previous Render deploy.
   - Disable checkout CTA temporarily if billing-specific outage.

## 5) Launch-day operating cadence
1. Check funnel events hourly in PostHog/GA4.
2. Track conversion: visitor -> signup -> verified -> first value action.
3. Collect pilot feedback in a single backlog doc and prioritize same-day fixes.
