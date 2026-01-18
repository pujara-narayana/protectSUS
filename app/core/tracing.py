"""Arize Phoenix tracing configuration for LLM observability"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def setup_phoenix_tracing(
    project_name: str = "protectsus-agents",
    enabled: bool = True,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    client_headers: Optional[str] = None
) -> Optional[object]:
    """
    Configure Arize Phoenix tracing for LLM observability

    This sets up automatic instrumentation for:
    - OpenAI SDK calls (chat completions, embeddings)
    - Anthropic SDK calls (messages)
    - LangChain/LangGraph workflows
    - Custom spans for agent workflows

    Args:
        project_name: Name of the project in Phoenix (default: "protectsus-agents")
        enabled: Whether to enable tracing (default: True)
        api_key: Phoenix API key for cloud (reads from env if not provided)
        base_url: Phoenix base URL (reads from env if not provided)
        client_headers: Custom headers for authentication (reads from env if not provided)

    Returns:
        TracerProvider object if successful, None if disabled or failed

    Environment Variables:
        PHOENIX_ENABLED: Enable/disable tracing (default: True)
        PHOENIX_API_KEY: API key for Phoenix cloud
        PHOENIX_BASE_URL: Base URL (e.g., https://app.phoenix.arize.com/s/your-space)
        PHOENIX_CLIENT_HEADERS: Custom headers (e.g., "Authorization=Bearer token")

    References:
        - Phoenix Docs: https://arize.com/docs/phoenix
        - Tracing Guide: https://arize.com/docs/phoenix/get-started/get-started-tracing
        - OpenAI Integration: https://arize.com/docs/phoenix/tracing/integrations-tracing/openai
        - Anthropic Integration: https://arize.com/docs/phoenix/tracing/integrations-tracing/anthropic
        - LangChain Integration: https://arize.com/docs/phoenix/tracing/integrations-tracing/langchain
    """

    if not enabled:
        logger.info("Phoenix tracing is disabled")
        return None

    try:
        # Set environment variables for Phoenix
        if api_key:
            os.environ["PHOENIX_API_KEY"] = api_key
            logger.debug(f"Set PHOENIX_API_KEY")

        if base_url:
            os.environ["PHOENIX_BASE_URL"] = base_url
            logger.debug(f"Set PHOENIX_BASE_URL: {base_url}")

        if client_headers:
            os.environ["PHOENIX_CLIENT_HEADERS"] = client_headers
            logger.debug(f"Set PHOENIX_CLIENT_HEADERS")

        # Import Phoenix OTEL register
        from phoenix.otel import register

        # Configure the Phoenix tracer with auto-instrumentation
        logger.info("Registering Phoenix tracer with auto-instrumentation...")
        tracer_provider = register(
            project_name=project_name,
            auto_instrument=True  # Auto-instrument OpenAI, Anthropic, LangChain
        )

        endpoint_info = base_url or "http://localhost:6006"

        logger.info(
            f"✓ Phoenix tracing initialized successfully\n"
            f"  Project: {project_name}\n"
            f"  Endpoint: {endpoint_info}\n"
            f"  Auto-instrumentation: Enabled\n"
            f"  Supported SDKs: OpenAI, Anthropic, LangChain/LangGraph"
        )

        return tracer_provider

    except ImportError as e:
        logger.warning(
            f"Phoenix tracing packages not installed: {e}\n"
            f"Install with:\n"
            f"  pip install arize-phoenix-otel\n"
            f"  pip install openinference-instrumentation-openai\n"
            f"  pip install openinference-instrumentation-anthropic\n"
            f"  pip install openinference-instrumentation-langchain"
        )
        return None

    except Exception as e:
        logger.error(f"Failed to initialize Phoenix tracing: {e}", exc_info=True)
        return None


def get_phoenix_url(base_url: Optional[str] = None) -> str:
    """
    Get the Phoenix UI URL for viewing traces

    Args:
        base_url: Phoenix base URL (e.g., https://app.phoenix.arize.com/s/your-space)

    Returns:
        URL to Phoenix UI
    """
    if base_url:
        return base_url

    return "http://localhost:6006"


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
