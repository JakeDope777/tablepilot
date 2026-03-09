"""
Growth analytics forwarding utilities (PostHog).
"""

import logging
from typing import Optional

import httpx

from ..core.config import settings

logger = logging.getLogger(__name__)


async def send_posthog_event(
    event_name: str,
    distinct_id: str,
    properties: Optional[dict] = None,
) -> bool:
    if not settings.POSTHOG_API_KEY:
        return False

    payload = {
        "api_key": settings.POSTHOG_API_KEY,
        "event": event_name,
        "distinct_id": distinct_id,
        "properties": properties or {},
    }

    endpoint = f"{settings.POSTHOG_HOST.rstrip('/')}/capture/"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(endpoint, json=payload)
            response.raise_for_status()
        return True
    except Exception as exc:
        logger.error("PostHog capture failed: %s", exc)
        return False
