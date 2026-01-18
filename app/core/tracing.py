"""Arize Phoenix tracing configuration for LLM observability"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def setup_phoenix_tracing(
    project_name: str = "protectsus-agents",
    enabled: bool = True,
    api_key: Optional[str] = None,
    collector_endpoint: Optional[str] = None
) -> Optional[object]:
    """
    Configure Arize Phoenix tracing for LLM observability

    This sets up automatic instrumentation for:
    - OpenAI SDK calls (chat completions, embeddings)
    - Anthropic SDK calls (messages)
    - Custom spans for agent workflows

    Args:
        project_name: Name of the project in Phoenix (default: "protectsus-agents")
        enabled: Whether to enable tracing (default: True)
        api_key: Phoenix API key for cloud (reads from env if not provided)
        collector_endpoint: Phoenix collector endpoint URL (reads from env if not provided)

    Returns:
        TracerProvider object if successful, None if disabled or failed

    Environment Variables:
        PHOENIX_ENABLED: Enable/disable tracing (default: True)
        PHOENIX_API_KEY: API key for Phoenix cloud
        PHOENIX_COLLECTOR_ENDPOINT: Collector endpoint URL
        PHOENIX_HOST: Local Phoenix host (default: localhost)
        PHOENIX_PORT: Local Phoenix port (default: 6006)

    References:
        - Phoenix Docs: https://arize.com/docs/phoenix
        - Tracing Guide: https://arize.com/docs/phoenix/get-started/get-started-tracing
        - OpenAI Integration: https://arize.com/docs/phoenix/tracing/integrations-tracing/openai
        - Anthropic Integration: https://arize.com/docs/phoenix/tracing/integrations-tracing/anthropic
    """

    if not enabled:
        logger.info("Phoenix tracing is disabled")
        return None

    try:
        # Set environment variables for Phoenix cloud if provided
        if api_key:
            os.environ["PHOENIX_API_KEY"] = api_key
        elif "PHOENIX_API_KEY" in os.environ:
            api_key = os.environ["PHOENIX_API_KEY"]

        if collector_endpoint:
            os.environ["PHOENIX_COLLECTOR_ENDPOINT"] = collector_endpoint
        elif "PHOENIX_COLLECTOR_ENDPOINT" in os.environ:
            collector_endpoint = os.environ["PHOENIX_COLLECTOR_ENDPOINT"]

        # Import Phoenix OTEL register
        from phoenix.otel import register

        # Configure the Phoenix tracer with auto-instrumentation
        tracer_provider = register(
            project_name=project_name,
            auto_instrument=True  # Auto-instrument based on installed packages
        )

        endpoint_info = collector_endpoint or f"http://{os.getenv('PHOENIX_HOST', 'localhost')}:{os.getenv('PHOENIX_PORT', '6006')}"

        logger.info(
            f"✓ Phoenix tracing initialized successfully\n"
            f"  Project: {project_name}\n"
            f"  Endpoint: {endpoint_info}\n"
            f"  Auto-instrumentation: Enabled\n"
            f"  Supported SDKs: OpenAI, Anthropic"
        )

        return tracer_provider

    except ImportError as e:
        logger.warning(
            f"Phoenix tracing packages not installed: {e}\n"
            f"Install with: pip install arize-phoenix-otel "
            f"openinference-instrumentation-openai "
            f"openinference-instrumentation-anthropic"
        )
        return None

    except Exception as e:
        logger.error(f"Failed to initialize Phoenix tracing: {e}", exc_info=True)
        return None


def get_phoenix_url(
    host: str = "localhost",
    port: int = 6006,
    collector_endpoint: Optional[str] = None
) -> str:
    """
    Get the Phoenix UI URL for viewing traces

    Args:
        host: Phoenix host (default: localhost)
        port: Phoenix port (default: 6006)
        collector_endpoint: Cloud endpoint (overrides host/port)

    Returns:
        URL to Phoenix UI
    """
    if collector_endpoint:
        # Extract base URL from collector endpoint
        # e.g., https://app.phoenix.arize.com/s/your-space/v1/traces -> https://app.phoenix.arize.com/s/your-space
        base_url = "/".join(collector_endpoint.split("/")[:5])
        return base_url

    return f"http://{host}:{port}"


def create_custom_span(name: str, attributes: dict = None):
    """
    Create a custom span for manual instrumentation

    Args:
        name: Span name
        attributes: Dictionary of attributes to add to the span

    Usage:
        with create_custom_span("agent_orchestration", {"agent_count": 2}):
            # Your code here
            pass

    Returns:
        Context manager for the span
    """
    try:
        from opentelemetry import trace

        tracer = trace.get_tracer(__name__)
        span = tracer.start_span(name)

        if attributes:
            for key, value in attributes.items():
                span.set_attribute(key, value)

        return span

    except Exception as e:
        logger.warning(f"Failed to create custom span: {e}")

        # Return a no-op context manager
        from contextlib import nullcontext
        return nullcontext()


# Utility decorators for tracing
def trace_function(name: Optional[str] = None, attributes: dict = None):
    """
    Decorator to automatically trace a function

    Args:
        name: Custom span name (defaults to function name)
        attributes: Custom attributes to add to the span

    Usage:
        @trace_function(name="custom_agent_task", attributes={"task_type": "analysis"})
        async def analyze_code(code: str):
            # Function implementation
            pass
    """
    def decorator(func):
        import functools

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            span_name = name or func.__name__
            with create_custom_span(span_name, attributes):
                return await func(*args, **kwargs)

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            span_name = name or func.__name__
            with create_custom_span(span_name, attributes):
                return func(*args, **kwargs)

        # Return appropriate wrapper based on function type
        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator
