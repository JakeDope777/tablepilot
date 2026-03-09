#!/usr/bin/env python3
"""Validate required deployment environment variables for MVP launch."""

from __future__ import annotations

import os
import sys

BACKEND_REQUIRED = [
    "DATABASE_URL",
    "SECRET_KEY",
    "APP_BASE_URL",
    "FRONTEND_BASE_URL",
    "CORS_ORIGINS_CSV",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_PRO_MONTHLY",
    "STRIPE_PRICE_ENTERPRISE_MONTHLY",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USERNAME",
    "SMTP_PASSWORD",
    "SMTP_FROM_EMAIL",
    "POSTHOG_API_KEY",
]

FRONTEND_REQUIRED = [
    "VITE_API_URL",
    "VITE_APP_URL",
    "VITE_GA_MEASUREMENT_ID",
    "VITE_POSTHOG_KEY",
    "VITE_POSTHOG_HOST",
]


def missing(keys: list[str]) -> list[str]:
    return [k for k in keys if not os.getenv(k)]


def main() -> int:
    backend_missing = missing(BACKEND_REQUIRED)
    frontend_missing = missing(FRONTEND_REQUIRED)

    print("Deployment env validation")
    print("- Backend missing:", ", ".join(backend_missing) if backend_missing else "none")
    print("- Frontend missing:", ", ".join(frontend_missing) if frontend_missing else "none")

    if backend_missing or frontend_missing:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
