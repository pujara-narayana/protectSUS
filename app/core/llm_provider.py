"""LLM Provider factory for multi-provider support"""

from typing import Optional, Dict, Any
from enum import Enum
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMProvider(str, Enum):
    """Supported LLM providers"""

    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GEMINI = "gemini"
    OPENROUTER = "openrouter"


class LLMClient:
    """Unified LLM client interface"""

    def __init__(self, provider: Optional[str] = None):
        """
        Initialize LLM client with specified provider

        Args:
            provider: LLM provider name (anthropic, openai, gemini, openrouter)
                     If None, uses LLM_PROVIDER from settings
        """
        self.provider = provider or settings.LLM_PROVIDER
        self.client = None
        self.model = None
        self._initialize_client()

    def _initialize_client(self):
        """Initialize the appropriate LLM client"""
        try:
            if self.provider == LLMProvider.ANTHROPIC:
                self._init_anthropic()
            elif self.provider == LLMProvider.OPENAI:
                self._init_openai()
            elif self.provider == LLMProvider.GEMINI:
                self._init_gemini()
            elif self.provider == LLMProvider.OPENROUTER:
                self._init_openrouter()
            else:
                raise ValueError(f"Unsupported LLM provider: {self.provider}")

            logger.info(
                f"Initialized LLM provider: {self.provider} with model: {self.model}"
            )

        except Exception as e:
            logger.error(f"Error initializing LLM provider {self.provider}: {e}")
            raise

    def _init_anthropic(self):
        """Initialize Anthropic Claude client"""
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY not set in environment")

        from anthropic import Anthropic

        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = "claude-3-5-sonnet-20241022"

    def _init_openai(self):
        """Initialize OpenAI client"""
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not set in environment")

        from openai import OpenAI

        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4-turbo-preview"  # or gpt-4, gpt-3.5-turbo

    def _init_gemini(self):
        """Initialize Google Gemini client"""
        if not settings.GOOGLE_API_KEY:
            raise ValueError("GOOGLE_API_KEY not set in environment")

        import google.generativeai as genai

        genai.configure(api_key=settings.GOOGLE_API_KEY)
        self.client = genai
        self.model = "gemini-pro"

    def _init_openrouter(self):
        """Initialize OpenRouter client (uses OpenAI-compatible API)"""
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY not set in environment")

        from openai import OpenAI

        self.client = OpenAI(
            api_key=settings.OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1"
        )
        self.model = "anthropic/claude-3.5-sonnet"  # Can use any OpenRouter model

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0,
        max_tokens: int = 4096,
    ) -> Dict[str, Any]:
        """
        Generate response from LLM

        Args:
            system_prompt: System/instruction prompt
            user_prompt: User message
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens to generate

        Returns:
            Dictionary with 'text' and 'usage' information
        """
        try:
            if self.provider == LLMProvider.ANTHROPIC:
                return await self._generate_anthropic(
                    system_prompt, user_prompt, temperature, max_tokens
                )
            elif self.provider == LLMProvider.OPENAI:
                return await self._generate_openai(
                    system_prompt, user_prompt, temperature, max_tokens
                )
            elif self.provider == LLMProvider.GEMINI:
                return await self._generate_gemini(
                    system_prompt, user_prompt, temperature, max_tokens
                )
            elif self.provider == LLMProvider.OPENROUTER:
                return await self._generate_openrouter(
                    system_prompt, user_prompt, temperature, max_tokens
                )
        except Exception as e:
            logger.error(f"Error generating with {self.provider}: {e}")
            raise

    async def _generate_anthropic(
        self, system_prompt: str, user_prompt: str, temperature: float, max_tokens: int
    ) -> Dict[str, Any]:
        """Generate using Anthropic Claude"""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )

        return {
            "text": response.content[0].text,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.input_tokens
                + response.usage.output_tokens,
            },
        }

    async def _generate_openai(
        self, system_prompt: str, user_prompt: str, temperature: float, max_tokens: int
    ) -> Dict[str, Any]:
        """Generate using OpenAI GPT"""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )

        return {
            "text": response.choices[0].message.content,
            "usage": {
                "input_tokens": response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            },
        }

    async def _generate_gemini(
        self, system_prompt: str, user_prompt: str, temperature: float, max_tokens: int
    ) -> Dict[str, Any]:
        """Generate using Google Gemini"""
        model = self.client.GenerativeModel(
            model_name=self.model,
            generation_config={
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            },
        )

        # Gemini doesn't have separate system prompt, so combine them
        combined_prompt = f"{system_prompt}\n\n{user_prompt}"

        response = model.generate_content(combined_prompt)

        # Gemini doesn't provide token counts in the same way, estimate
        text = response.text
        estimated_tokens = len(text.split()) * 1.3  # Rough estimate

        return {
            "text": text,
            "usage": {
                "input_tokens": 0,  # Not available
                "output_tokens": int(estimated_tokens),
                "total_tokens": int(estimated_tokens),
            },
        }

    async def _generate_openrouter(
        self, system_prompt: str, user_prompt: str, temperature: float, max_tokens: int
    ) -> Dict[str, Any]:
        """Generate using OpenRouter"""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )

        return {
            "text": response.choices[0].message.content,
            "usage": {
                "input_tokens": response.usage.prompt_tokens if response.usage else 0,
                "output_tokens": (
                    response.usage.completion_tokens if response.usage else 0
                ),
                "total_tokens": response.usage.total_tokens if response.usage else 0,
            },
        }

    def get_model_info(self) -> Dict[str, str]:
        """Get information about the current model"""
        return {"provider": self.provider, "model": self.model}
