"""Celery application configuration"""

import logging
from celery import Celery
from app.core.config import settings

logger = logging.getLogger(__name__)

# Create Celery instance
celery_app = Celery(
    "protectsus",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=['app.tasks.analysis_tasks']
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=1800,  # 30 minutes
    task_soft_time_limit=1500,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=10,
)

# Initialize Phoenix tracing for Celery worker
try:
    if settings.PHOENIX_ENABLED:
        from app.core.tracing import setup_phoenix_tracing
        
        phoenix_url = settings.phoenix_url
        
        logger.info("Initializing Phoenix tracing for Celery worker...")
        tracer = setup_phoenix_tracing(
            project_name="protectsus-celery-worker",
            enabled=settings.PHOENIX_ENABLED,
            api_key=settings.PHOENIX_API_KEY,
            base_url=phoenix_url,
            client_headers=settings.PHOENIX_CLIENT_HEADERS
        )
        
        if tracer:
            logger.info(f"✓ Phoenix tracing initialized for Celery worker at {phoenix_url}")
        else:
            logger.warning("Phoenix tracing initialization returned None")
except Exception as e:
    logger.error(f"Failed to initialize Phoenix tracing in Celery worker: {e}")
