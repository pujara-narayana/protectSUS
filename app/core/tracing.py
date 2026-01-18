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
    """

    if not enabled:
        print("[PHOENIX] Tracing is disabled")
        return None

    try:
        print(f"[PHOENIX] Setting up tracing...")
        print(f"[PHOENIX] API Key present: {bool(api_key)}")
        print(f"[PHOENIX] Base URL: {base_url}")
        
        # Set environment variables for Phoenix OTEL
        if api_key:
            # Remove quotes if present
            clean_api_key = api_key.strip("'\"")
            os.environ["PHOENIX_API_KEY"] = clean_api_key
            print(f"[PHOENIX] Set PHOENIX_API_KEY")

        if base_url:
            # Remove quotes if present  
            clean_url = base_url.strip("'\"")
            # Phoenix OTEL uses PHOENIX_COLLECTOR_ENDPOINT
            os.environ["PHOENIX_COLLECTOR_ENDPOINT"] = clean_url
            print(f"[PHOENIX] Set PHOENIX_COLLECTOR_ENDPOINT: {clean_url}")

        # Import Phoenix OTEL register
        from phoenix.otel import register
        print("[PHOENIX] Imported phoenix.otel.register")

        # Configure the Phoenix tracer
        print(f"[PHOENIX] Registering tracer for project: {project_name}")
        tracer_provider = register(
            project_name=project_name
        )
        print("[PHOENIX] Tracer registered")

        # Manually instrument LLM providers
        try:
            from openinference.instrumentation.openai import OpenAIInstrumentor
            OpenAIInstrumentor().instrument(tracer_provider=tracer_provider)
            print("[PHOENIX] ✓ OpenAI instrumented")
        except Exception as e:
            print(f"[PHOENIX] OpenAI instrumentation skipped: {e}")

        try:
            from openinference.instrumentation.anthropic import AnthropicInstrumentor
            AnthropicInstrumentor().instrument(tracer_provider=tracer_provider)
            print("[PHOENIX] ✓ Anthropic instrumented")
        except Exception as e:
            print(f"[PHOENIX] Anthropic instrumentation skipped: {e}")

        try:
            from openinference.instrumentation.langchain import LangChainInstrumentor
            LangChainInstrumentor().instrument(tracer_provider=tracer_provider)
            print("[PHOENIX] ✓ LangChain instrumented")
        except Exception as e:
            print(f"[PHOENIX] LangChain instrumentation skipped: {e}")

        print(f"[PHOENIX] ✓ Tracing initialized successfully!")
        print(f"[PHOENIX]   Project: {project_name}")
        print(f"[PHOENIX]   Endpoint: {base_url}")
        
        logger.info(f"✓ Phoenix tracing initialized for {project_name}")

        return tracer_provider

    except ImportError as e:
        print(f"[PHOENIX] ❌ Import error: {e}")
        logger.warning(f"Phoenix tracing packages not installed: {e}")
        return None

    except Exception as e:
        print(f"[PHOENIX] ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        logger.error(f"Failed to initialize Phoenix tracing: {e}")
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
