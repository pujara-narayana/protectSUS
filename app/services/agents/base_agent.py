"""Base agent class for security analysis with Phoenix tracing"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List
import logging
import time

from app.core.config import settings
from app.core.llm_provider import LLMClient
from app.core.tracing import TracedSpan

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """Base class for security analysis agents"""

    def __init__(self, name: str, llm_provider: str = None):
        self.name = name
        self.llm_client = LLMClient(provider=llm_provider)
        self.max_tokens = 4096

    @abstractmethod
    async def analyze(self, code: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze code and return findings

        Args:
            code: Compressed code to analyze
            context: Additional context (file mappings, metadata, etc.)

        Returns:
            Dictionary with findings and metadata
        """
        pass

    async def _call_llm(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0
    ) -> str:
        """Call LLM API with given prompts (traced with Phoenix)"""
        model_info = self.llm_client.get_model_info()
        
        # Create a traced span for this LLM call
        with TracedSpan(f"llm_call.{self.name}", {
            "agent.name": self.name,
            "llm.provider": model_info['provider'],
            "llm.model": model_info['model'],
            "llm.temperature": temperature,
            "llm.max_tokens": self.max_tokens,
            "prompt.system_length": len(system_prompt),
            "prompt.user_length": len(user_prompt),
        }) as span:
            try:
                start_time = time.time()

                response = await self.llm_client.generate(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    temperature=temperature,
                    max_tokens=self.max_tokens
                )

                execution_time = time.time() - start_time
                tokens_used = response['usage']['total_tokens']

                # Add result attributes to span
                if span:
                    span.set_attribute("llm.tokens_used", tokens_used)
                    span.set_attribute("llm.execution_time_seconds", round(execution_time, 3))
                    span.set_attribute("llm.response_length", len(response['text']))

                logger.info(
                    f"{self.name}: {model_info['provider']}:{model_info['model']} "
                    f"API call completed in {execution_time:.2f}s, tokens: {tokens_used}"
                )

                return response['text']

            except Exception as e:
                logger.error(f"{self.name}: Error calling LLM API: {e}")
                raise

    def _extract_findings(self, response: str, finding_type: str) -> List[Dict[str, Any]]:
        """
        Extract structured findings from Claude response

        This is a simplified version - in production, you'd use more sophisticated parsing
        """
        findings = []

        # Split response into lines and look for structured output
        lines = response.split('\n')
        current_finding = {}

        for line in lines:
            line = line.strip()

            if line.startswith('FILE:'):
                if current_finding:
                    findings.append(current_finding)
                current_finding = {'type': finding_type, 'file_path': line.replace('FILE:', '').strip()}

            elif line.startswith('LINE:'):
                current_finding['line_number'] = int(line.replace('LINE:', '').strip())

            elif line.startswith('SEVERITY:'):
                current_finding['severity'] = line.replace('SEVERITY:', '').strip().lower()

            elif line.startswith('TYPE:'):
                current_finding['type'] = line.replace('TYPE:', '').strip()

            elif line.startswith('DESCRIPTION:'):
                current_finding['description'] = line.replace('DESCRIPTION:', '').strip()

            elif line.startswith('CWE:'):
                current_finding['cwe_id'] = line.replace('CWE:', '').strip()

            elif line.startswith('FIX:'):
                current_finding['recommended_fix'] = line.replace('FIX:', '').strip()

        # Add last finding
        if current_finding and 'file_path' in current_finding:
            findings.append(current_finding)

        return findings
