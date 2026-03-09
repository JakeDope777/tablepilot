"""
Integration service layer for connector lifecycle and execution.
"""

from __future__ import annotations

import copy
import datetime as dt
from collections import deque
import inspect
import time
from typing import Any, Optional
import uuid

from sqlalchemy.exc import SQLAlchemyError

from ...core.config import settings
from ...db.models import IntegrationRun
from ...db.session import SessionLocal
from . import ConnectorRegistry
from .base import ConnectorInterface
from .n8n_catalog import list_n8n_connectors, n8n_catalog_stats


class IntegrationService:
    """Coordinates connector discovery, auth, status checks, and actions."""

    def __init__(self) -> None:
        self.registry = ConnectorRegistry()
        self._active_connectors: dict[str, ConnectorInterface] = {}
        self._run_history: deque[dict[str, Any]] = deque(maxlen=2000)
        self._idempotency_cache: dict[str, dict[str, Any]] = {}
        self._idempotency_order: deque[str] = deque()
        self._idempotency_max_entries = 2000

    def list_catalog(self) -> dict[str, Any]:
        marketplace = n8n_catalog_stats()
        return {
            "connectors": self.registry.list_connectors(),
            "categories": self.registry.list_categories(),
            "total": len(self.registry.CONNECTOR_MAP),
            "marketplace": {
                "source": "n8n_snapshot",
                **marketplace,
            },
        }

    def list_marketplace_catalog(
        self,
        limit: int = 200,
        offset: int = 0,
        search: Optional[str] = None,
        provider: Optional[str] = None,
        category: Optional[str] = None,
    ) -> dict[str, Any]:
        requested_provider = (provider or "all").strip().lower()
        requested_category = (category or "").strip().lower()

        rows = self._collect_marketplace_rows(
            search=search,
            provider=requested_provider,
            category=requested_category or None,
        )
        safe_offset = max(0, offset)
        safe_limit = max(1, limit)
        clipped = rows[safe_offset : safe_offset + safe_limit]
        next_offset = safe_offset + len(clipped)
        return {
            "connectors": clipped,
            "returned": len(clipped),
            "offset": safe_offset,
            "next_offset": next_offset,
            "has_more": next_offset < len(rows),
            "total_filtered": len(rows),
            "search": search or "",
            "provider": requested_provider,
            "category": requested_category,
            "stats": {
                "source": "mixed_catalog",
                "native_total_connectors": len(self.registry.CONNECTOR_MAP),
                "available_providers": ["all", "native", "n8n"],
                **n8n_catalog_stats(),
            },
        }

    def get_marketplace_summary(
        self,
        search: Optional[str] = None,
        provider: Optional[str] = None,
        category: Optional[str] = None,
    ) -> dict[str, Any]:
        requested_provider = (provider or "all").strip().lower()
        requested_category = (category or "").strip().lower()
        rows = self._collect_marketplace_rows(
            search=search,
            provider=requested_provider,
            category=requested_category or None,
        )
        provider_counts: dict[str, int] = {}
        category_counts: dict[str, int] = {}
        for row in rows:
            provider_key = row.get("provider") or "unknown"
            provider_counts[provider_key] = provider_counts.get(provider_key, 0) + 1
            category_key = row.get("category") or "other"
            category_counts[category_key] = category_counts.get(category_key, 0) + 1

        top_categories = sorted(
            (
                {"key": key, "count": count}
                for key, count in category_counts.items()
            ),
            key=lambda item: item["count"],
            reverse=True,
        )
        return {
            "provider": requested_provider,
            "category": requested_category,
            "search": search or "",
            "total_filtered": len(rows),
            "providers": sorted(
                (
                    {"key": key, "count": count}
                    for key, count in provider_counts.items()
                ),
                key=lambda item: item["key"],
            ),
            "categories": top_categories,
        }

    def list_marketplace_providers(self) -> dict[str, Any]:
        native_rows = self._list_native_marketplace()
        n8n_rows = list_n8n_connectors(limit=5000)
        native_categories = sorted({row["category"] for row in native_rows if row.get("category")})
        n8n_categories = sorted({row["category"] for row in n8n_rows if row.get("category")})
        return {
            "providers": [
                {
                    "key": "native",
                    "name": "Native Connectors",
                    "count": len(native_rows),
                    "categories": native_categories,
                },
                {
                    "key": "n8n",
                    "name": "n8n Templates",
                    "count": len(n8n_rows),
                    "categories": n8n_categories,
                    "source": n8n_catalog_stats(),
                },
            ],
            "total_visible": len(native_rows) + len(n8n_rows),
        }

    def get_marketplace_connector_detail(
        self,
        connector_key: str,
        provider: Optional[str] = None,
    ) -> dict[str, Any]:
        requested_provider = (provider or "all").strip().lower()
        key = (connector_key or "").strip().lower()
        if not key:
            raise ValueError("Connector key is required.")

        matches: list[dict[str, Any]] = []
        if requested_provider in {"all", "native"}:
            matches.extend(
                [row for row in self._list_native_marketplace() if row["key"].lower() == key]
            )
        if requested_provider in {"all", "n8n", "n8n_snapshot"}:
            matches.extend(
                [row for row in list_n8n_connectors(limit=5000) if row["key"].lower() == key]
            )

        if not matches:
            raise ValueError(f"Unknown marketplace connector '{connector_key}'.")

        primary = matches[0]
        native_variant = next((row for row in matches if row["provider"] == "native"), None)
        n8n_variant = next((row for row in matches if row["provider"] == "n8n"), None)
        return {
            "key": key,
            "display_name": primary["name"],
            "requested_provider": requested_provider,
            "providers_available": sorted({row["provider"] for row in matches}),
            "category": primary.get("category"),
            "native_connector": native_variant,
            "n8n_template": n8n_variant,
            "suggested_actions": self._suggested_actions(key, providers=matches),
            "variants": matches,
        }

    def _list_native_marketplace(
        self,
        search: Optional[str] = None,
        category: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        query = (search or "").strip().lower()
        category_filter = (category or "").strip().lower()

        rows: list[dict[str, Any]] = []
        for idx, connector in enumerate(self.registry.list_connectors(), start=1):
            key = connector["key"]
            name = self._humanize_connector_key(key)
            connector_category = connector.get("category", "")

            if category_filter and connector_category != category_filter:
                continue
            if query and query not in key and query not in name.lower():
                continue

            rows.append(
                {
                    "id": f"native-{idx:04d}",
                    "key": key,
                    "name": name,
                    "provider": "native",
                    "type": "connector_native",
                    "category": connector_category,
                    "class": connector.get("class"),
                    "base_url": connector.get("base_url"),
                    "source_url": None,
                }
            )
        return rows

    def _collect_marketplace_rows(
        self,
        search: Optional[str] = None,
        provider: str = "all",
        category: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        if provider in {"all", "native"}:
            rows.extend(
                self._list_native_marketplace(
                    search=search,
                    category=category,
                )
            )
        if provider in {"all", "n8n", "n8n_snapshot"}:
            rows.extend(
                list_n8n_connectors(
                    limit=5000,
                    search=search,
                    category=category,
                )
            )
        return rows

    def list_runs(
        self,
        limit: int = 50,
        connector: Optional[str] = None,
        status: Optional[str] = None,
        event: Optional[str] = None,
    ) -> dict[str, Any]:
        connector_filter = (connector or "").strip().lower()
        status_filter = (status or "").strip().lower()
        event_filter = (event or "").strip().lower()

        rows = self._list_runs_from_db(
            connector=connector_filter or None,
            status=status_filter or None,
            event=event_filter or None,
        )
        if rows is None:
            rows = list(reversed(self._run_history))
            if connector_filter:
                rows = [row for row in rows if row.get("connector", "").lower() == connector_filter]
            if status_filter:
                rows = [row for row in rows if row.get("status", "").lower() == status_filter]
            if event_filter:
                rows = [row for row in rows if row.get("event", "").lower() == event_filter]

        safe_limit = max(1, limit)
        clipped = rows[:safe_limit]
        return {
            "runs": clipped,
            "returned": len(clipped),
            "total_filtered": len(rows),
            "limit": safe_limit,
            "connector": connector_filter,
            "status": status_filter,
            "event": event_filter,
        }

    def get_run_summary(self, connector: Optional[str] = None) -> dict[str, Any]:
        connector_filter = (connector or "").strip().lower()
        rows = self._list_runs_from_db(connector=connector_filter or None)
        if rows is None:
            rows = list(self._run_history)
            if connector_filter:
                rows = [row for row in rows if row.get("connector", "").lower() == connector_filter]

        success_count = sum(1 for row in rows if row.get("status") == "success")
        error_count = sum(1 for row in rows if row.get("status") == "error")
        by_connector: dict[str, int] = {}
        for row in rows:
            key = row.get("connector", "unknown")
            by_connector[key] = by_connector.get(key, 0) + 1

        avg_duration_ms = (
            sum(float(row.get("duration_ms", 0)) for row in rows) / len(rows)
            if rows
            else 0.0
        )
        return {
            "connector": connector_filter,
            "total_runs": len(rows),
            "success_count": success_count,
            "error_count": error_count,
            "success_rate": round(success_count / len(rows), 4) if rows else 0.0,
            "avg_duration_ms": round(avg_duration_ms, 2),
            "by_connector": by_connector,
        }

    def _list_runs_from_db(
        self,
        connector: Optional[str] = None,
        status: Optional[str] = None,
        event: Optional[str] = None,
    ) -> Optional[list[dict[str, Any]]]:
        try:
            with SessionLocal() as db:
                query = db.query(IntegrationRun)
                if connector:
                    query = query.filter(IntegrationRun.connector == connector)
                if status:
                    query = query.filter(IntegrationRun.status == status)
                if event:
                    query = query.filter(IntegrationRun.event == event)
                query = query.order_by(IntegrationRun.created_at.desc())
                rows = query.all()
            return [
                {
                    "id": row.id,
                    "timestamp": row.created_at.isoformat() + "Z" if row.created_at else None,
                    "connector": row.connector,
                    "event": row.event,
                    "status": row.status,
                    "duration_ms": row.duration_ms,
                    "error": row.error,
                    "metadata": row.meta_payload or {},
                }
                for row in rows
            ]
        except SQLAlchemyError:
            return None

    @staticmethod
    def _humanize_connector_key(key: str) -> str:
        if key == "n8n":
            return "n8n"
        return " ".join(part.upper() if part == "crm" else part.capitalize() for part in key.split("_"))

    @staticmethod
    def _suggested_actions(key: str, providers: list[dict[str, Any]]) -> list[str]:
        suggestions: list[str] = []
        if any(row.get("provider") == "native" for row in providers):
            suggestions.extend(["connect", "test", "status", "action"])
        if key == "n8n":
            suggestions.extend(
                [
                    "trigger_workflow",
                    "send_event",
                    "sync_contact",
                    "sync_campaign_metrics",
                ]
            )
        if any(row.get("provider") == "n8n" for row in providers):
            suggestions.append("create workflow in n8n")
        # preserve order, remove duplicates
        return list(dict.fromkeys(suggestions))

    def _resolve(
        self,
        name: str,
        credentials: Optional[dict[str, Any]] = None,
    ) -> ConnectorInterface:
        if credentials is None and name in self._active_connectors:
            return self._active_connectors[name]

        resolved_credentials = self._default_credentials(name)
        if credentials:
            resolved_credentials.update(credentials)

        connector = self.registry.get(name, **resolved_credentials)
        self._active_connectors[name] = connector
        return connector

    @staticmethod
    def _default_credentials(name: str) -> dict[str, Any]:
        """Default connector credentials sourced from app settings."""
        if name == "n8n":
            defaults: dict[str, Any] = {"base_url": settings.N8N_BASE_URL}
            if settings.N8N_API_KEY:
                defaults["api_key"] = settings.N8N_API_KEY
            if settings.N8N_DEFAULT_WEBHOOK_URL:
                defaults["default_webhook_url"] = settings.N8N_DEFAULT_WEBHOOK_URL
            if settings.N8N_DEFAULT_WEBHOOK_PATH:
                defaults["default_webhook_path"] = settings.N8N_DEFAULT_WEBHOOK_PATH
            return defaults
        return {}

    def _record_run(
        self,
        connector: str,
        event: str,
        status: str,
        duration_ms: float,
        *,
        error: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> None:
        self._run_history.append(
            run_record := {
                "id": f"run_{uuid.uuid4().hex[:12]}",
                "timestamp": dt.datetime.utcnow().isoformat() + "Z",
                "connector": connector,
                "event": event,
                "status": status,
                "duration_ms": round(duration_ms, 2),
                "error": error,
                "metadata": metadata or {},
            }
        )
        self._persist_run_to_db(run_record)

    @staticmethod
    def _persist_run_to_db(run_record: dict[str, Any]) -> None:
        try:
            with SessionLocal() as db:
                db.add(
                    IntegrationRun(
                        id=run_record["id"],
                        connector=run_record["connector"],
                        event=run_record["event"],
                        status=run_record["status"],
                        duration_ms=float(run_record["duration_ms"]),
                        error=run_record.get("error"),
                        meta_payload=run_record.get("metadata") or {},
                    )
                )
                db.commit()
        except SQLAlchemyError:
            # Persist failure should never break connector execution flows.
            return

    def _idempotency_cache_key(self, connector: str, idempotency_key: str) -> str:
        return f"{connector}:{idempotency_key}"

    def _get_cached_idempotent_response(
        self,
        connector: str,
        idempotency_key: Optional[str],
    ) -> Optional[dict[str, Any]]:
        key = (idempotency_key or "").strip()
        if not key:
            return None
        cache_key = self._idempotency_cache_key(connector, key)
        cached = self._idempotency_cache.get(cache_key)
        if not cached:
            return None
        response = copy.deepcopy(cached["response"])
        idempotency_meta = response.setdefault("idempotency", {})
        idempotency_meta.update(
            {
                "enabled": True,
                "key": key,
                "replayed": True,
            }
        )
        return response

    def _store_idempotent_response(
        self,
        connector: str,
        idempotency_key: Optional[str],
        response: dict[str, Any],
    ) -> None:
        key = (idempotency_key or "").strip()
        if not key:
            return
        cache_key = self._idempotency_cache_key(connector, key)
        self._idempotency_cache[cache_key] = {
            "stored_at": dt.datetime.utcnow().isoformat() + "Z",
            "response": copy.deepcopy(response),
        }
        if cache_key not in self._idempotency_order:
            self._idempotency_order.append(cache_key)
        while len(self._idempotency_order) > self._idempotency_max_entries:
            oldest = self._idempotency_order.popleft()
            self._idempotency_cache.pop(oldest, None)

    async def connect(
        self,
        name: str,
        credentials: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        start = time.perf_counter()
        try:
            connector = self._resolve(name, credentials)
            await connector.authenticate()
            details = connector.get_status()
            self._record_run(
                name,
                "connect",
                "success",
                (time.perf_counter() - start) * 1000,
                metadata={"demo_mode": details.get("demo_mode", False)},
            )
            return details
        except Exception as exc:
            self._record_run(
                name,
                "connect",
                "error",
                (time.perf_counter() - start) * 1000,
                error=str(exc),
            )
            raise

    async def status(self, name: str) -> dict[str, Any]:
        start = time.perf_counter()
        try:
            connector = self._resolve(name)
            if not connector.get_status().get("authenticated") and not connector.demo_mode:
                await connector.authenticate()
            details = connector.get_status()
            self._record_run(
                name,
                "status",
                "success",
                (time.perf_counter() - start) * 1000,
                metadata={"demo_mode": details.get("demo_mode", False)},
            )
            return details
        except Exception as exc:
            self._record_run(
                name,
                "status",
                "error",
                (time.perf_counter() - start) * 1000,
                error=str(exc),
            )
            raise

    async def test(
        self,
        name: str,
        credentials: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        start = time.perf_counter()
        try:
            connector = self._resolve(name, credentials)
            await connector.authenticate()
            details = {
                "status": "ok",
                "connector_status": connector.get_status(),
                "message": "Connection test completed",
            }
            self._record_run(
                name,
                "test",
                "success",
                (time.perf_counter() - start) * 1000,
                metadata={"demo_mode": connector.get_status().get("demo_mode", False)},
            )
            return details
        except Exception as exc:
            self._record_run(
                name,
                "test",
                "error",
                (time.perf_counter() - start) * 1000,
                error=str(exc),
            )
            raise

    async def run_action(
        self,
        name: str,
        action: Optional[str] = None,
        payload: Optional[dict[str, Any]] = None,
        context: Optional[dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
        endpoint: Optional[str] = None,
        method: str = "GET",
        params: Optional[dict[str, Any]] = None,
        data: Optional[dict[str, Any]] = None,
        credentials: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        start = time.perf_counter()
        event_name = action or f"{method.upper()} {endpoint or ''}".strip()
        cached = self._get_cached_idempotent_response(name, idempotency_key)
        if cached is not None:
            self._record_run(
                name,
                event_name,
                "success",
                (time.perf_counter() - start) * 1000,
                metadata={
                    "idempotency_key": (idempotency_key or "").strip(),
                    "replayed": True,
                },
            )
            return cached

        try:
            connector = self._resolve(name, credentials)
            await connector.authenticate()

            result: Any
            if action:
                if not hasattr(connector, action):
                    raise ValueError(f"Unsupported action '{action}' for connector '{name}'.")
                fn = getattr(connector, action)
                if not callable(fn):
                    raise ValueError(f"Connector action '{action}' is not callable.")
                result = fn(**(payload or {}))
                if inspect.isawaitable(result):
                    result = await result
            else:
                if not endpoint:
                    raise ValueError("Either 'action' or 'endpoint' must be provided.")
                upper_method = method.upper()
                if upper_method == "GET":
                    result = await connector.get_data(endpoint, params=params)
                elif upper_method == "POST":
                    request_body = data if data is not None else payload
                    result = await connector.post_data(endpoint, data=request_body)
                else:
                    raise ValueError(
                        f"Unsupported method '{method}'. Supported methods: GET, POST."
                    )

            details = {
                "status": "success",
                "connector_status": connector.get_status(),
                "result": result,
                "idempotency": {
                    "enabled": bool((idempotency_key or "").strip()),
                    "key": (idempotency_key or "").strip() or None,
                    "replayed": False,
                },
            }
            self._store_idempotent_response(name, idempotency_key, details)
            self._record_run(
                name,
                event_name,
                "success",
                (time.perf_counter() - start) * 1000,
                metadata={
                    "demo_mode": connector.get_status().get("demo_mode", False),
                    "idempotency_key": (idempotency_key or "").strip() or None,
                    "context": context or {},
                },
            )
            return details
        except Exception as exc:
            self._record_run(
                name,
                event_name,
                "error",
                (time.perf_counter() - start) * 1000,
                error=str(exc),
            )
            raise
