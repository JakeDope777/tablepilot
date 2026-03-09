"""Billing webhook tests for idempotency and signature checks."""

import json

from app.core.config import settings
from app.db import models


def test_billing_health_endpoint(client, auth_headers):
    response = client.get("/billing/health", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "stripe_secret_configured" in data
    assert "stripe_webhook_secret_configured" in data
    assert "stripe_prices_configured" in data


def test_webhook_rejects_invalid_signature(client):
    old_secret = settings.STRIPE_WEBHOOK_SECRET
    settings.STRIPE_WEBHOOK_SECRET = "whsec_test"
    payload = b'{"id":"evt_invalid","type":"invoice.paid","data":{"object":{}}}'

    response = client.post(
        "/billing/webhook",
        data=payload,
        headers={"Stripe-Signature": "t=1700000000,v1=notavalidsignature"},
    )

    settings.STRIPE_WEBHOOK_SECRET = old_secret
    assert response.status_code == 400


def test_webhook_idempotency_and_subscription_sync(client, db_session):
    old_secret = settings.STRIPE_WEBHOOK_SECRET
    settings.STRIPE_WEBHOOK_SECRET = None

    signup = client.post(
        "/auth/signup",
        json={"email": "billing-webhook-test@example.com", "password": "testpassword123"},
    )
    assert signup.status_code in (201, 409)

    user = db_session.query(models.User).filter(models.User.email == "billing-webhook-test@example.com").first()
    user.stripe_customer_id = "cus_test_idempotency"
    db_session.commit()

    event_payload = {
        "id": "evt_idempotency_001",
        "type": "customer.subscription.created",
        "data": {
            "object": {
                "id": "sub_test_001",
                "customer": "cus_test_idempotency",
                "status": "active",
                "current_period_start": 1700000000,
                "current_period_end": 1702592000,
                "cancel_at_period_end": False,
                "items": {"data": [{"price": {"id": "price_pro"}}]},
            }
        },
    }

    first = client.post("/billing/webhook", data=json.dumps(event_payload).encode("utf-8"))
    second = client.post("/billing/webhook", data=json.dumps(event_payload).encode("utf-8"))

    settings.STRIPE_WEBHOOK_SECRET = old_secret

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json().get("duplicate") is False
    assert second.json().get("duplicate") is True

    webhook_events = (
        db_session.query(models.StripeWebhookEvent)
        .filter(models.StripeWebhookEvent.stripe_event_id == "evt_idempotency_001")
        .all()
    )
    assert len(webhook_events) == 1
    assert webhook_events[0].status == "processed"

    subscription = (
        db_session.query(models.BillingSubscription)
        .filter(models.BillingSubscription.user_id == user.id)
        .first()
    )
    assert subscription is not None
    assert subscription.status == "active"
