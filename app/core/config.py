"""Application configuration settings"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application
    APP_ENV: str = "development"
    DEBUG: bool = True
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    SECRET_KEY: str

    # LLM Provider Configuration
    LLM_PROVIDER: str = "anthropic"  # Options: anthropic, openai, gemini, openrouter

    # Anthropic API (Claude)
    ANTHROPIC_API_KEY: Optional[str] = None

    # OpenAI API (GPT-4, GPT-3.5)
    OPENAI_API_KEY: Optional[str] = None

    # Google Gemini API
    GOOGLE_API_KEY: Optional[str] = None

    # OpenRouter API
    OPENROUTER_API_KEY: Optional[str] = None

    # MongoDB
    MONGODB_URI: str
    MONGODB_DB_NAME: str = "protectsus"

    # Neo4j
    NEO4J_URI: str
    NEO4J_USER: str
    NEO4J_PASSWORD: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # GitHub App
    GITHUB_APP_ID: str
    GITHUB_APP_PRIVATE_KEY_PATH: str
    GITHUB_WEBHOOK_SECRET: str

    # GitHub OAuth (for user authentication - optional)
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    GITHUB_OAUTH_CALLBACK_URL: str = "http://api.protectsus.tech/auth"

    # Token Company API
    TOKEN_COMPANY_API_KEY: str
    TOKEN_COMPANY_MODEL: str = "bear-1"

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Arize Phoenix Tracing
    PHOENIX_ENABLED: bool = True
    PHOENIX_BASE_URL: Optional[str] = None  # e.g., https://app.phoenix.arize.com/s/your-space
    PHOENIX_COLLECTOR_ENDPOINT: Optional[str] = None  # Alternative to BASE_URL
    PHOENIX_API_KEY: Optional[str] = None
    PHOENIX_CLIENT_HEADERS: Optional[str] = None
    PHOENIX_HOST: Optional[str] = "localhost"
    PHOENIX_PORT: Optional[int] = 6006

    @property
    def phoenix_url(self) -> Optional[str]:
        """Get Phoenix URL from either BASE_URL, COLLECTOR_ENDPOINT, or HOST:PORT"""
        if self.PHOENIX_BASE_URL:
            return self.PHOENIX_BASE_URL
        if self.PHOENIX_COLLECTOR_ENDPOINT:
            return self.PHOENIX_COLLECTOR_ENDPOINT
        if self.PHOENIX_HOST and self.PHOENIX_PORT:
            return f"http://{self.PHOENIX_HOST}:{self.PHOENIX_PORT}"
        return None

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
