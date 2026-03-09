"""
Integrations API endpoints.

GET  /integrations/catalog         - List available connectors and categories
GET  /integrations/marketplace     - List 200+ connector marketplace entries
GET  /integrations/marketplace/providers - List marketplace provider metadata
GET  /integrations/marketplace/summary - List marketplace counts by provider/category
GET  /integrations/marketplace/connectors/{connector_key} - Get connector detail
GET  /integrations/marketplace/stats - Marketplace metadata
GET  /integrations/runs            - List recent connector runs
GET  /integrations/runs/summary    - Aggregate connector run stats
POST /integrations/{name}/connect  - Initialize/authenticate connector
POST /integrations/{name}/test     - Test connector connectivity
GET  /integrations/{name}/status   - Get connector status
POST /integrations/{name}/action   - Execute connector action or endpoint call
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from ..db.schemas import (
    IntegrationActionRequest,
    IntegrationConnectRequest,
    IntegrationResponse,
)
from ..modules.integrations.n8n_catalog import n8n_catalog_stats
from ..modules.integrations.service import IntegrationService

router = APIRouter(prefix="/integrations", tags=["Integrations"])

_service = IntegrationService()


def get_service() -> IntegrationService:
    return _service


@router.get("/catalog")
async def get_catalog(service: IntegrationService = Depends(get_service)):
    """List all connectors and categories."""
    return service.list_catalog()


@router.get("/marketplace")
async def get_marketplace_catalog(
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    search: str = Query(default=""),
    provider: str = Query(default="all"),
    category: str = Query(default=""),
    service: IntegrationService = Depends(get_service),
):
    """List connector marketplace templates (snapshot)."""
    return service.list_marketplace_catalog(
        limit=limit,
        offset=offset,
        search=search or None,
        provider=provider or "all",
        category=category or None,
    )


@router.get("/marketplace/providers")
async def get_marketplace_providers(
    service: IntegrationService = Depends(get_service),
):
    """List provider metadata for connector marketplace filters."""
    return service.list_marketplace_providers()


@router.get("/marketplace/summary")
async def get_marketplace_summary(
    search: str = Query(default=""),
    provider: str = Query(default="all"),
    category: str = Query(default=""),
    service: IntegrationService = Depends(get_service),
):
    """Return marketplace counts grouped by provider and category."""
    return service.get_marketplace_summary(
        search=search or None,
        provider=provider or "all",
        category=category or None,
    )


@router.get("/marketplace/connectors/{connector_key}")
async def get_marketplace_connector_detail(
    connector_key: str,
    provider: str = Query(default="all"),
    service: IntegrationService = Depends(get_service),
):
    """Get marketplace connector details for UI drawer and demo actions."""
    try:
        return service.get_marketplace_connector_detail(
            connector_key=connector_key,
            provider=provider,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/marketplace/stats")
async def get_marketplace_stats():
    """Return marketplace catalog stats used for this demo."""
    return n8n_catalog_stats()


@router.get("/n8n/catalog")
async def get_n8n_catalog_alias(
    limit: int = Query(default=200, ge=1, le=500),
    search: str = Query(default=""),
    service: IntegrationService = Depends(get_service),
):
    """Backward-compatible alias for marketplace endpoint."""
    return service.list_marketplace_catalog(limit=limit, search=search or None)


@router.get("/n8n/stats")
async def get_n8n_stats_alias():
    """Backward-compatible alias for marketplace stats endpoint."""
    return n8n_catalog_stats()


@router.get("/runs")
async def get_connector_runs(
    limit: int = Query(default=50, ge=1, le=500),
    connector: str = Query(default=""),
    status: str = Query(default=""),
    event: str = Query(default=""),
    service: IntegrationService = Depends(get_service),
):
    """Return recent connector runs for observability widgets."""
    return service.list_runs(
        limit=limit,
        connector=connector or None,
        status=status or None,
        event=event or None,
    )


@router.get("/runs/summary")
async def get_connector_runs_summary(
    connector: str = Query(default=""),
    service: IntegrationService = Depends(get_service),
):
    """Return aggregate run metrics for connector operations."""
    return service.get_run_summary(connector=connector or None)


@router.post("/{name}/connect", response_model=IntegrationResponse)
async def connect_integration(
    name: str,
    request: IntegrationConnectRequest,
    service: IntegrationService = Depends(get_service),
):
    """Authenticate and initialize a connector instance."""
    try:
        details = await service.connect(name=name, credentials=request.credentials)
        return IntegrationResponse(connector=name, status="connected", details=details)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except TypeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid credentials: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/{name}/test", response_model=IntegrationResponse)
async def test_integration(
    name: str,
    request: IntegrationConnectRequest,
    service: IntegrationService = Depends(get_service),
):
    """Test connector authentication and readiness."""
    try:
        details = await service.test(name=name, credentials=request.credentials)
        return IntegrationResponse(connector=name, status="ok", details=details)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except TypeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid credentials: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{name}/status", response_model=IntegrationResponse)
async def get_integration_status(
    name: str,
    service: IntegrationService = Depends(get_service),
):
    """Get current connector status."""
    try:
        details = await service.status(name=name)
        return IntegrationResponse(connector=name, status="ok", details=details)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/{name}/action", response_model=IntegrationResponse)
async def run_integration_action(
    name: str,
    request: IntegrationActionRequest,
    service: IntegrationService = Depends(get_service),
):
    """Execute a connector action or raw endpoint request."""
    try:
        details = await service.run_action(
            name=name,
            action=request.action,
            payload=request.payload,
            context=request.context,
            idempotency_key=request.idempotency_key,
            endpoint=request.endpoint,
            method=request.method,
            params=request.params,
            data=request.data,
            credentials=request.credentials,
        )
        return IntegrationResponse(connector=name, status="success", details=details)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "Unknown connector" in message else 400
        raise HTTPException(status_code=status_code, detail=message)
    except TypeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid action payload: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
