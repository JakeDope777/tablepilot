# Analytics QA Matrix (PostHog + GA4) — March 6, 2026

## Scope
Validate event integrity for the MVP funnel:
Visitor -> Signup -> Verified -> First Value Action -> Return Session

## Preconditions
- Backend `POSTHOG_API_KEY` set.
- Frontend `VITE_GA_MEASUREMENT_ID` set.
- Frontend `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` set.
- `VITE_API_URL` points to deployed backend.

## Event Contract
1. `landing_view`
- Trigger: Landing page load.
- Properties: `utm_source`, `utm_medium`, `utm_campaign`.

2. `signup_started`
- Trigger: Register form submit start.
- Properties: UTM set.

3. `signup_completed`
- Trigger: Successful signup.
- Properties: UTM set.

4. `verification_completed`
- Trigger: Successful email verification.
- Properties: UTM set.

5. `dashboard_viewed`
- Trigger: Dashboard page load.
- Properties: UTM set.

6. `analysis_run`
- Trigger: Successful analysis action.
- Properties: `analysis_type` + UTM set.

7. `chat_message_sent`
- Trigger: Message sent from chat.
- Properties: `length` + UTM set.

8. `checkout_started`
- Trigger: Billing checkout CTA click.
- Properties: `plan` + UTM set.

9. `checkout_completed`
- Trigger: Billing success return state.
- Properties: UTM set.

## QA Steps
1. Open landing with UTM query params.
2. Register user and complete verification.
3. Login and open dashboard.
4. Run one analysis and send one chat message.
5. Start checkout in Stripe test mode.
6. Return to billing success state.
7. Confirm events in:
- Backend DB table `growth_events`
- PostHog live events
- GA4 realtime events

## Pass Criteria
- All nine events appear with expected properties.
- No missing UTM fields for first-session events.
- Event timestamps align within acceptable delay (<2 min) across systems.
- Funnel summary endpoint responds:
- `GET /growth/funnel-summary?days=14`

## Verification Queries
- Backend SQL quick checks:
  - `SELECT event_name, COUNT(*) FROM growth_events GROUP BY event_name;`
  - `SELECT event_name, properties FROM growth_events ORDER BY created_at DESC LIMIT 20;`
