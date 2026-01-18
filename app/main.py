"""Main FastAPI application entry point"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import connect_databases, disconnect_databases
from app.core.tracing import setup_phoenix_tracing, get_phoenix_url
from app.api.v1 import webhooks, analysis, feedback, chat
from app.api import auth

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting ProtectSUS application...")

    # Initialize Phoenix tracing
    if settings.PHOENIX_ENABLED:
        phoenix_url = settings.phoenix_url
        tracer = setup_phoenix_tracing(
            project_name="protectsus-agents",
            enabled=settings.PHOENIX_ENABLED,
            api_key=settings.PHOENIX_API_KEY,
            base_url=phoenix_url,
            client_headers=settings.PHOENIX_CLIENT_HEADERS
        )

        if tracer:
            display_url = get_phoenix_url(base_url=phoenix_url)
            logger.info(f"Phoenix UI available at: {display_url}")

    # Connect databases
    await connect_databases()
    logger.info("Application started successfully")

    yield

    # Shutdown
    logger.info("Shutting down ProtectSUS application...")
    await disconnect_databases()
    logger.info("Application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="ProtectSUS",
    description="AI-Powered Code Security Analysis Platform",
    version="0.1.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.DEBUG else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, tags=["authentication"])  # Auth at root level for /auth callback
app.include_router(webhooks.router, prefix="/api/v1", tags=["webhooks"])
app.include_router(analysis.router, prefix="/api/v1", tags=["analysis"])
app.include_router(feedback.router, prefix="/api/v1", tags=["feedback"])
app.include_router(chat.router, prefix="/api/v1", tags=["chat"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "ProtectSUS",
        "version": "0.1.0",
        "description": "AI-Powered Code Security Analysis Platform",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "environment": settings.APP_ENV
    }
