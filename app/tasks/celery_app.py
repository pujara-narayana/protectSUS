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
    broker_connection_retry_on_startup=True,  # Fix deprecation warning
)

# Initialize Phoenix tracing for Celery worker
print(f"[CELERY_APP] PHOENIX_ENABLED: {settings.PHOENIX_ENABLED}")
try:
    if settings.PHOENIX_ENABLED:
        from app.core.tracing import setup_phoenix_tracing
        
        phoenix_url = settings.phoenix_url
        print(f"[CELERY_APP] Phoenix URL: {phoenix_url}")
        print(f"[CELERY_APP] PHOENIX_API_KEY present: {bool(settings.PHOENIX_API_KEY)}")
        print(f"[CELERY_APP] Initializing Phoenix tracing for Celery worker...")
        
        tracer = setup_phoenix_tracing(
            project_name="protectsus-celery-worker",
            enabled=settings.PHOENIX_ENABLED,
            api_key=settings.PHOENIX_API_KEY,
            base_url=phoenix_url,
            client_headers=settings.PHOENIX_CLIENT_HEADERS
        )
        
        if tracer:
            print(f"[CELERY_APP] ✓ Phoenix tracing initialized at {phoenix_url}")
        else:
            print("[CELERY_APP] ⚠ Phoenix tracing initialization returned None")
    else:
        print("[CELERY_APP] Phoenix tracing is disabled")
except Exception as e:
    print(f"[CELERY_APP] ❌ Failed to initialize Phoenix: {e}")
    import traceback
    traceback.print_exc()
