"""
n8n Connector

Supports triggering n8n workflows via webhook URLs or API endpoints.
Falls back to demo mode when no n8n credentials/URLs are configured.
"""

from __future__ import annotations

import logging
import random
from datetime import datetime
from typing import Optional, Any

from .base import ConnectorInterface

logger = logging.getLogger(__name__)


class N8NConnector(ConnectorInterface):
    """Connector for n8n workflow/webhook execution."""

    BASE_URL = "http://localhost:5678"

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        default_webhook_url: Optional[str] = None,
        default_webhook_path: Optional[str] = None,
    ):
        super().__init__(service_name="n8n", rate_limit=60, rate_window=60)
        self.base_url = (base_url or self.BASE_URL).rstrip("/")
        self.api_key = api_key
        self.default_webhook_url = default_webhook_url
        self.default_webhook_path = default_webhook_path

        if not any([self.api_key, self.default_webhook_url, self.default_webhook_path]):
            self._enter_demo_mode("No n8n API key or webhook configured")

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-N8N-API-KEY"] = self.api_key
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def authenticate(self) -> None:
        """Authenticate connector (lightweight readiness for n8n)."""
        if self._demo_mode:
            return
        self._is_authenticated = True
        logger.info("[n8n] Connector authenticated.")

    def _resolve_webhook_target(
        self,
        webhook_url: Optional[str] = None,
        webhook_path: Optional[str] = None,
    ) -> str:
        if webhook_url:
            return webhook_url

        effective_path = webhook_path or self.default_webhook_path
        if effective_path:
            return f"{self.base_url}/{effective_path.lstrip('/')}"

        if self.default_webhook_url:
            return self.default_webhook_url

        raise ValueError(
            "No n8n webhook target configured. Provide webhook_url/webhook_path "
            "or set N8N_DEFAULT_WEBHOOK_URL/N8N_DEFAULT_WEBHOOK_PATH."
        )

    async def get_data(self, endpoint: str, params: Optional[dict] = None) -> dict:
        """Fetch data from n8n API or webhook endpoint."""
        if self._demo_mode:
            return self._generate_demo_data("get", endpoint, params=params)
        await self._ensure_authenticated()
        url = endpoint if endpoint.startswith("http") else f"{self.base_url}/{endpoint.lstrip('/')}"
        return await self._request_with_retry(
            "GET",
            url,
            headers=self._headers(),
            params=params,
        )

    async def post_data(self, endpoint: str, data: Optional[dict] = None) -> dict:
        """Post data to n8n API or webhook endpoint."""
        if self._demo_mode:
            return self._generate_demo_data("post", endpoint, payload=data)
        await self._ensure_authenticated()
        url = endpoint if endpoint.startswith("http") else f"{self.base_url}/{endpoint.lstrip('/')}"
        return await self._request_with_retry(
            "POST",
            url,
            headers=self._headers(),
            json_data=data,
        )

    async def trigger_workflow(
        self,
        payload: Optional[dict] = None,
        webhook_url: Optional[str] = None,
        webhook_path: Optional[str] = None,
    ) -> dict:
        """Trigger an n8n workflow by webhook."""
        if self._demo_mode:
            return self._generate_demo_data(
                "trigger_workflow",
                webhook_url or webhook_path or "default",
                payload=payload,
            )

        target = self._resolve_webhook_target(webhook_url=webhook_url, webhook_path=webhook_path)
        result = await self._request_with_retry(
            "POST",
            target,
            headers=self._headers(),
            json_data=payload or {},
        )
        return {
            "demo": False,
            "status": "triggered",
            "target": target,
            "response": result,
            "triggered_at": datetime.utcnow().isoformat(),
        }

    async def send_event(
        self,
        event_name: str,
        payload: Optional[dict] = None,
        webhook_url: Optional[str] = None,
        webhook_path: Optional[str] = None,
    ) -> dict:
        """Send a named event to n8n."""
        body = {"event_name": event_name, "payload": payload or {}}
        return await self.trigger_workflow(
            payload=body,
            webhook_url=webhook_url,
            webhook_path=webhook_path,
        )

    async def sync_contact(
        self,
        contact: dict[str, Any],
        webhook_url: Optional[str] = None,
        webhook_path: Optional[str] = None,
    ) -> dict:
        """Send contact sync payload to n8n."""
        return await self.send_event(
            event_name="sync_contact",
            payload={"contact": contact},
            webhook_url=webhook_url,
            webhook_path=webhook_path,
        )

    async def sync_campaign_metrics(
        self,
        campaign_id: str,
        metrics: dict[str, Any],
        webhook_url: Optional[str] = None,
        webhook_path: Optional[str] = None,
    ) -> dict:
        """Send campaign metrics sync payload to n8n."""
        return await self.send_event(
            event_name="sync_campaign_metrics",
            payload={"campaign_id": campaign_id, "metrics": metrics},
            webhook_url=webhook_url,
            webhook_path=webhook_path,
        )

    def _generate_demo_data(
        self,
        action: str,
        target: str,
        params: Optional[dict] = None,
        payload: Optional[dict] = None,
    ) -> dict:
        return {
            "demo": True,
            "service": "n8n",
            "action": action,
            "status": "triggered" if action in {"trigger_workflow", "post"} else "ok",
            "target": target,
            "params": params or {},
            "payload": payload or {},
            "execution_id": f"demo_exec_{random.randint(10000, 99999)}",
            "triggered_at": datetime.utcnow().isoformat(),
        }
