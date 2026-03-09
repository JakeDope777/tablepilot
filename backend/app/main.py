"""
TablePilot AI - Main FastAPI Application

Central entry point that registers all API routers, configures middleware,
and initialises the database and brain components.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .core.config import settings
from .db.session import init_db
from .api import auth, chat, analysis, creative, crm, analytics, memory, billing, growth, integrations, restaurant


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: initialise resources on startup."""
    # Initialise database tables
    init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "AI operating partner for restaurants with control tower, margin, "
        "inventory/waste, labor, and manager chat workflows."
    ),
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=(
        [origin.strip() for origin in settings.CORS_ORIGINS_CSV.split(",") if origin.strip()]
        if settings.CORS_ORIGINS_CSV
        else settings.CORS_ORIGINS
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(analysis.router)
app.include_router(creative.router)
app.include_router(crm.router)
app.include_router(analytics.router)
app.include_router(memory.router)
app.include_router(billing.router)
app.include_router(growth.router)
app.include_router(integrations.router)
app.include_router(restaurant.router)


@app.get("/api/health", tags=["Health"])
async def api_health():
    """API health check."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "modules": [
            "brain_memory",
            "business_analysis",
            "creative_design",
            "crm_campaign",
            "analytics_reporting",
            "integrations",
            "restaurant_ops",
        ],
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "database": "connected",
        "llm_configured": bool(settings.OPENAI_API_KEY),
        "memory_path": settings.MEMORY_BASE_PATH,
    }


@app.get("/health/ready", tags=["Health"])
async def readiness_check():
    """Readiness probe for container/platform checks."""
    return {
        "status": "ready",
        "database_url_configured": bool(settings.DATABASE_URL),
        "jwt_secret_configured": settings.SECRET_KEY != "change-me-in-production-use-a-strong-random-key",
    }


@app.get("/", tags=["Health"])
async def root(request: Request):
    """Root endpoint.

    Returns JSON for API clients by default and serves SPA only when
    the client explicitly asks for HTML.
    """
    static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
    index_path = os.path.join(static_dir, "index.html")
    accept = request.headers.get("accept", "")
    wants_html = "text/html" in accept and "application/json" not in accept
    if os.path.exists(index_path) and wants_html:
        return FileResponse(index_path)
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "modules": [
            "brain_memory",
            "business_analysis",
            "creative_design",
            "crm_campaign",
            "analytics_reporting",
            "integrations",
            "restaurant_ops",
        ],
    }


# Mount static files for the built frontend (after API routes)
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="static-assets")

    # SPA catch-all: serve index.html for any unmatched route
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """Serve the SPA for any route not matched by API endpoints."""
        file_path = os.path.join(static_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_dir, "index.html"))
