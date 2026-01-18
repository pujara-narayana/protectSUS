"""Arize Phoenix tracing configuration for LLM observability

This module sets up comprehensive tracing for:
- LangChain agents and chains
- LangGraph workflows and state machines
- LLM calls (OpenAI, Anthropic, etc.)
- Custom agent spans
"""

import os
import logging
from typing import Optional
from functools import wraps

logger = logging.getLogger(__name__)

# Global tracer reference
_tracer_provider = None


def setup_phoenix_tracing(
    project_name: str = "protectsus-agents",
    enabled: bool = True,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    client_headers: Optional[str] = None
) -> Optional[object]:
    """
    Configure Arize Phoenix tracing for LLM observability.

    This sets up automatic instrumentation for:
    - OpenAI SDK calls (chat completions, embeddings)
    - Anthropic SDK calls (messages)
    - LangChain agents, chains, and tools
    - LangGraph workflows and state transitions
    - Custom spans for agent orchestration

    Args:
        project_name: Name of the project in Phoenix dashboard
        enabled: Whether tracing is enabled
        api_key: Phoenix API key for cloud
        base_url: Phoenix collector endpoint
        client_headers: Additional headers for authentication

    Returns:
        TracerProvider if successful, None otherwise
    """
    global _tracer_provider

    if not enabled:
        print("[PHOENIX] Tracing is disabled")
        return None

    try:
        print(f"[PHOENIX] Setting up tracing for project: {project_name}")
        
        # Clean up values (remove quotes if present)
        clean_api_key = api_key.strip("'\"") if api_key else None
        clean_url = base_url.strip("'\"") if base_url else None
        
        # Set environment variables (Phoenix picks these up automatically)
        if clean_api_key:
            os.environ["PHOENIX_API_KEY"] = clean_api_key
            print(f"[PHOENIX] Set PHOENIX_API_KEY")
        
        if clean_url:
            os.environ["PHOENIX_COLLECTOR_ENDPOINT"] = clean_url
            print(f"[PHOENIX] Set PHOENIX_COLLECTOR_ENDPOINT: {clean_url}")
            # Explicitly set protocol to silence inference warning
            os.environ["PHOENIX_COLLECTOR_PROTOCOL"] = "http/protobuf"

        # Import Phoenix OTEL registration
        from phoenix.otel import register
        
        # Register tracer with auto-instrumentation
        # Phoenix 12.x+ automatically instruments installed libraries
        # via the auto_instrument parameter
        _tracer_provider = register(
            project_name=project_name,
            endpoint=clean_url,
            auto_instrument=True,  # Enable auto-instrumentation for all supported libraries
        )

        print(f"[PHOENIX] ✓ Tracing initialized!")
        print(f"[PHOENIX]   Project: {project_name}")
        print(f"[PHOENIX]   Endpoint: {clean_url}")
        print(f"[PHOENIX]   Auto-instrumentation: enabled")
        
        # Log which instrumentors are available
        _log_available_instrumentors()
        
        logger.info(f"✓ Phoenix tracing initialized for {project_name}")

        return _tracer_provider

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


def _log_available_instrumentors():
    """Log which instrumentation packages are available."""
    instrumentors = {
        "LangChain": "openinference.instrumentation.langchain",
        "OpenAI": "openinference.instrumentation.openai",
        "Anthropic": "openinference.instrumentation.anthropic",
    }
    
    for name, package in instrumentors.items():
        try:
            __import__(package)
            print(f"[PHOENIX]   ✓ {name} instrumentation available")
        except ImportError:
            print(f"[PHOENIX]   ✗ {name} instrumentation not installed")


def get_phoenix_url(base_url: Optional[str] = None) -> str:
    """
    Get the Phoenix UI URL for viewing traces.

    Args:
        base_url: Phoenix base URL (e.g., https://app.phoenix.arize.com/s/your-space)

    Returns:
        URL to Phoenix UI
    """
    if base_url:
        return base_url
    return "http://localhost:6006"


def get_tracer(name: str = __name__):
    """
    Get a tracer for creating custom spans.
    
    Args:
        name: Name for the tracer (usually __name__)
        
    Returns:
        OpenTelemetry tracer instance
    """
    try:
        from opentelemetry import trace
        return trace.get_tracer(name)
    except Exception as e:
        logger.warning(f"Failed to get tracer: {e}")
        return None


def create_custom_span(name: str, attributes: dict = None):
    """
    Create a custom span for manual instrumentation.

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
        from contextlib import nullcontext
        return nullcontext()


class TracedSpan:
    """Context manager for traced spans with automatic error handling."""
    
    def __init__(self, name: str, attributes: dict = None):
        self.name = name
        self.attributes = attributes or {}
        self.span = None
        
    def __enter__(self):
        try:
            from opentelemetry import trace
            from opentelemetry.trace import Status, StatusCode
            
            tracer = trace.get_tracer(__name__)
            self.span = tracer.start_span(self.name)
            
            for key, value in self.attributes.items():
                if value is not None:
                    self.span.set_attribute(str(key), str(value) if not isinstance(value, (int, float, bool)) else value)
            
            return self.span
        except Exception as e:
            logger.warning(f"Failed to create span: {e}")
            return None
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.span:
            try:
                from opentelemetry.trace import Status, StatusCode
                
                if exc_type:
                    self.span.set_status(Status(StatusCode.ERROR, str(exc_val)))
                    self.span.record_exception(exc_val)
                else:
                    self.span.set_status(Status(StatusCode.OK))
                
                self.span.end()
            except Exception as e:
                logger.warning(f"Failed to end span: {e}")
        return False  # Don't suppress exceptions


def trace_agent_workflow(
    workflow_name: str = None,
    agent_name: str = None,
    capture_input: bool = True,
    capture_output: bool = True
):
    """
    Decorator to trace agent workflow functions.
    
    This creates a span for the entire workflow and captures:
    - Workflow/agent name
    - Input parameters (if capture_input=True)
    - Output results (if capture_output=True)
    - Execution time
    - Errors

    Usage:
        @trace_agent_workflow(workflow_name="security_analysis", agent_name="VulnerabilityAgent")
        async def analyze(self, code: str, context: dict):
            # Agent logic here
            pass
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            span_name = workflow_name or agent_name or func.__name__
            
            attributes = {
                "agent.name": agent_name or "unknown",
                "workflow.name": workflow_name or func.__name__,
                "workflow.type": "agent_analysis",
            }
            
            # Capture input (be careful with large inputs)
            if capture_input and kwargs:
                for key, value in kwargs.items():
                    if isinstance(value, str) and len(value) < 1000:
                        attributes[f"input.{key}"] = value[:500]  # Truncate large values
                    elif isinstance(value, (int, float, bool)):
                        attributes[f"input.{key}"] = value
            
            with TracedSpan(span_name, attributes) as span:
                result = await func(*args, **kwargs)
                
                # Capture output summary
                if capture_output and span and result:
                    if isinstance(result, dict):
                        for key in ['findings_count', 'vulnerabilities', 'dependency_risks']:
                            if key in result:
                                val = result[key]
                                if isinstance(val, list):
                                    span.set_attribute(f"output.{key}_count", len(val))
                                else:
                                    span.set_attribute(f"output.{key}", str(val)[:500])
                
                return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            span_name = workflow_name or agent_name or func.__name__
            
            attributes = {
                "agent.name": agent_name or "unknown",
                "workflow.name": workflow_name or func.__name__,
            }
            
            with TracedSpan(span_name, attributes) as span:
                result = func(*args, **kwargs)
                return result
        
        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def trace_langgraph_node(node_name: str):
    """
    Decorator specifically for LangGraph node functions.
    
    Usage:
        @trace_langgraph_node("vulnerability_analysis")
        async def _run_vulnerability_analysis(self, state: AnalysisState) -> AnalysisState:
            # Node logic
            pass
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            attributes = {
                "langgraph.node": node_name,
                "langgraph.type": "state_node",
            }
            
            # Try to extract state info
            if args and len(args) > 1:
                state = args[1] if len(args) > 1 else kwargs.get('state')
                if state and isinstance(state, dict):
                    attributes["state.vulnerabilities_count"] = len(state.get('vulnerabilities', []))
                    attributes["state.errors_count"] = len(state.get('errors', []))
            
            with TracedSpan(f"langgraph.{node_name}", attributes):
                return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            with TracedSpan(f"langgraph.{node_name}", {"langgraph.node": node_name}):
                return func(*args, **kwargs)
        
        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


# Legacy decorator for backward compatibility
def trace_function(name: Optional[str] = None, attributes: dict = None):
    """
    Decorator to automatically trace a function.

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
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            span_name = name or func.__name__
            with TracedSpan(span_name, attributes):
                return await func(*args, **kwargs)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            span_name = name or func.__name__
            with TracedSpan(span_name, attributes):
                return func(*args, **kwargs)

        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator
