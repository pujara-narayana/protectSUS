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

    # GitHub OAuth (for user authentication)
    GITHUB_CLIENT_ID: str
    GITHUB_CLIENT_SECRET: str
    GITHUB_OAUTH_CALLBACK_URL: str = "http://protectsus.tech/auth"

    # Token Company API
    TOKEN_COMPANY_API_KEY: str
    TOKEN_COMPANY_MODEL: str = "bear-1"

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Arize Phoenix
    PHOENIX_ENABLED: bool = True
    PHOENIX_HOST: str = "localhost"
    PHOENIX_PORT: int = 6006

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
