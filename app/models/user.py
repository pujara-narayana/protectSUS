"""User data models for GitHub OAuth authentication"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime


class GitHubInstallation(BaseModel):
    """GitHub App installation linked to a user"""
    installation_id: int = Field(..., description="GitHub installation ID")
    account_login: str = Field(..., description="GitHub account/organization login")
    account_type: str = Field(..., description="Account type (User or Organization)")
    repositories: List[str] = Field(default_factory=list, description="List of repository names")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class User(BaseModel):
    """User model for OAuth authenticated GitHub users"""
    # GitHub User Info
    github_id: int = Field(..., description="GitHub user ID")
    github_login: str = Field(..., description="GitHub username")
    email: Optional[EmailStr] = Field(None, description="User's email from GitHub")
    name: Optional[str] = Field(None, description="User's display name")
    avatar_url: Optional[str] = Field(None, description="User's GitHub avatar URL")

    # OAuth Tokens (encrypted)
    access_token_encrypted: str = Field(..., description="Encrypted GitHub OAuth access token")
    token_type: str = Field(default="bearer", description="OAuth token type")
    token_scope: Optional[str] = Field(None, description="OAuth scopes granted")

    # Installations
    installations: List[GitHubInstallation] = Field(
        default_factory=list,
        description="GitHub App installations linked to this user"
    )

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "github_id": 12345678,
                "github_login": "johndoe",
                "email": "john@example.com",
                "name": "John Doe",
                "avatar_url": "https://avatars.githubusercontent.com/u/12345678",
                "access_token_encrypted": "gAAAAABf...",
                "token_type": "bearer",
                "token_scope": "user:email,read:org",
                "installations": [
                    {
                        "installation_id": 123456,
                        "account_login": "acme-corp",
                        "account_type": "Organization",
                        "repositories": ["repo1", "repo2"]
                    }
                ],
                "created_at": "2024-01-17T00:00:00Z",
                "updated_at": "2024-01-17T00:00:00Z",
                "last_login": "2024-01-17T00:00:00Z"
            }
        }


class UserCreate(BaseModel):
    """Model for creating a new user from GitHub OAuth data"""
    github_id: int
    github_login: str
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    access_token: str  # Will be encrypted before storage
    token_type: str = "bearer"
    token_scope: Optional[str] = None


class UserResponse(BaseModel):
    """Public user response model (without sensitive data)"""
    github_id: int
    github_login: str
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    installations: List[GitHubInstallation] = Field(default_factory=list)
    created_at: datetime
    last_login: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "github_id": 12345678,
                "github_login": "johndoe",
                "email": "john@example.com",
                "name": "John Doe",
                "avatar_url": "https://avatars.githubusercontent.com/u/12345678",
                "installations": [],
                "created_at": "2024-01-17T00:00:00Z",
                "last_login": "2024-01-17T00:00:00Z"
            }
        }
