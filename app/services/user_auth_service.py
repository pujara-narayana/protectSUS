"""User authentication service for GitHub OAuth"""

import httpx
from typing import Optional, Dict, Any, List
import logging
from datetime import datetime

from app.core.database import MongoDB
from app.core.config import settings
from app.models.user import User, UserCreate, UserResponse, GitHubInstallation
from app.utils.encryption import encrypt_token, decrypt_token

logger = logging.getLogger(__name__)


class UserAuthService:
    """Service for GitHub OAuth user authentication"""

    # GitHub OAuth endpoints
    OAUTH_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
    OAUTH_TOKEN_URL = "https://github.com/login/oauth/access_token"
    GITHUB_API_BASE = "https://api.github.com"

    @staticmethod
    def get_authorization_url(state: Optional[str] = None) -> str:
        """
        Generate GitHub OAuth authorization URL

        Args:
            state: Optional state parameter for CSRF protection

        Returns:
            str: Authorization URL to redirect users to
        """
        params = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": settings.GITHUB_OAUTH_CALLBACK_URL,
            "scope": "user:email read:org",  # Scopes needed for user info and installations
        }

        if state:
            params["state"] = state

        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{UserAuthService.OAUTH_AUTHORIZE_URL}?{query_string}"

    @staticmethod
    async def exchange_code_for_token(code: str) -> Dict[str, Any]:
        """
        Exchange OAuth code for access token

        Args:
            code: Authorization code from GitHub OAuth callback

        Returns:
            Dict containing access_token, token_type, and scope

        Raises:
            Exception: If token exchange fails
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    UserAuthService.OAUTH_TOKEN_URL,
                    headers={
                        "Accept": "application/json",
                    },
                    data={
                        "client_id": settings.GITHUB_CLIENT_ID,
                        "client_secret": settings.GITHUB_CLIENT_SECRET,
                        "code": code,
                        "redirect_uri": settings.GITHUB_OAUTH_CALLBACK_URL,
                    },
                )

                response.raise_for_status()
                token_data = response.json()

                if "error" in token_data:
                    raise Exception(f"OAuth error: {token_data.get('error_description', token_data['error'])}")

                return token_data

        except Exception as e:
            logger.error(f"Error exchanging code for token: {e}")
            raise

    @staticmethod
    async def get_user_info(access_token: str) -> Dict[str, Any]:
        """
        Get user information from GitHub API

        Args:
            access_token: GitHub OAuth access token

        Returns:
            Dict containing user information (id, login, email, name, avatar_url, etc.)
        """
        try:
            async with httpx.AsyncClient() as client:
                # Get user info
                response = await client.get(
                    f"{UserAuthService.GITHUB_API_BASE}/user",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/vnd.github+json",
                    },
                )

                response.raise_for_status()
                user_data = response.json()

                # Get user emails if not public
                if not user_data.get("email"):
                    email_response = await client.get(
                        f"{UserAuthService.GITHUB_API_BASE}/user/emails",
                        headers={
                            "Authorization": f"Bearer {access_token}",
                            "Accept": "application/vnd.github+json",
                        },
                    )

                    if email_response.status_code == 200:
                        emails = email_response.json()
                        # Find primary verified email
                        for email in emails:
                            if email.get("primary") and email.get("verified"):
                                user_data["email"] = email["email"]
                                break

                return user_data

        except Exception as e:
            logger.error(f"Error getting user info: {e}")
            raise

    @staticmethod
    async def get_user_installations(access_token: str) -> List[Dict[str, Any]]:
        """
        Get GitHub App installations accessible by the user

        Args:
            access_token: GitHub OAuth access token

        Returns:
            List of installation data
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{UserAuthService.GITHUB_API_BASE}/user/installations",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/vnd.github+json",
                    },
                )

                response.raise_for_status()
                data = response.json()
                return data.get("installations", [])

        except Exception as e:
            logger.error(f"Error getting user installations: {e}")
            # Don't fail authentication if installations can't be fetched
            return []

    @staticmethod
    async def create_or_update_user(user_create: UserCreate) -> User:
        """
        Create a new user or update existing user in database

        Args:
            user_create: User creation data with plain text access token

        Returns:
            User: Created or updated user object
        """
        try:
            db = MongoDB.get_database()

            # Encrypt the access token
            encrypted_token = encrypt_token(user_create.access_token)

            # Check if user exists
            existing_user = await db.users.find_one({"github_id": user_create.github_id})

            if existing_user:
                # Update existing user
                update_data = {
                    "github_login": user_create.github_login,
                    "email": user_create.email,
                    "name": user_create.name,
                    "avatar_url": user_create.avatar_url,
                    "access_token_encrypted": encrypted_token,
                    "token_type": user_create.token_type,
                    "token_scope": user_create.token_scope,
                    "updated_at": datetime.utcnow(),
                    "last_login": datetime.utcnow(),
                }

                await db.users.update_one(
                    {"github_id": user_create.github_id},
                    {"$set": update_data}
                )

                logger.info(f"Updated user {user_create.github_login} (ID: {user_create.github_id})")

                # Fetch updated user
                updated_user = await db.users.find_one({"github_id": user_create.github_id})
                return User(**updated_user)

            else:
                # Create new user
                user = User(
                    github_id=user_create.github_id,
                    github_login=user_create.github_login,
                    email=user_create.email,
                    name=user_create.name,
                    avatar_url=user_create.avatar_url,
                    access_token_encrypted=encrypted_token,
                    token_type=user_create.token_type,
                    token_scope=user_create.token_scope,
                    installations=[],
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    last_login=datetime.utcnow(),
                )

                await db.users.insert_one(user.model_dump(mode='json'))

                logger.info(f"Created new user {user_create.github_login} (ID: {user_create.github_id})")

                return user

        except Exception as e:
            logger.error(f"Error creating/updating user: {e}", exc_info=True)
            raise

    @staticmethod
    async def sync_user_installations(github_id: int, access_token: str) -> None:
        """
        Sync user's GitHub App installations to database

        Args:
            github_id: GitHub user ID
            access_token: User's OAuth access token (plain text)
        """
        try:
            installations_data = await UserAuthService.get_user_installations(access_token)

            installations = []
            for install_data in installations_data:
                installation = GitHubInstallation(
                    installation_id=install_data["id"],
                    account_login=install_data["account"]["login"],
                    account_type=install_data["account"]["type"],
                    repositories=[],  # Could be populated from install_data if needed
                    created_at=datetime.utcnow()
                )
                installations.append(installation.model_dump(mode='json'))

            # Update user's installations in database
            db = MongoDB.get_database()
            await db.users.update_one(
                {"github_id": github_id},
                {"$set": {"installations": installations, "updated_at": datetime.utcnow()}}
            )

            logger.info(f"Synced {len(installations)} installations for user {github_id}")

        except Exception as e:
            logger.error(f"Error syncing installations: {e}", exc_info=True)
            # Don't fail - installations sync is not critical

    @staticmethod
    async def get_user_by_github_id(github_id: int) -> Optional[User]:
        """
        Get user by GitHub ID

        Args:
            github_id: GitHub user ID

        Returns:
            User object or None if not found
        """
        try:
            db = MongoDB.get_database()
            user_data = await db.users.find_one({"github_id": github_id})

            if user_data:
                return User(**user_data)
            return None

        except Exception as e:
            logger.error(f"Error retrieving user: {e}")
            raise

    @staticmethod
    async def get_user_access_token(github_id: int) -> Optional[str]:
        """
        Get decrypted access token for a user

        Args:
            github_id: GitHub user ID

        Returns:
            Decrypted access token or None if user not found
        """
        try:
            user = await UserAuthService.get_user_by_github_id(github_id)
            if user:
                return decrypt_token(user.access_token_encrypted)
            return None

        except Exception as e:
            logger.error(f"Error getting user access token: {e}")
            raise

    @staticmethod
    async def handle_oauth_callback(code: str, state: Optional[str] = None) -> UserResponse:
        """
        Handle OAuth callback - complete authentication flow

        Args:
            code: Authorization code from GitHub
            state: Optional state parameter for CSRF validation

        Returns:
            UserResponse: Public user data

        Raises:
            Exception: If authentication fails
        """
        try:
            # Exchange code for token
            token_data = await UserAuthService.exchange_code_for_token(code)
            access_token = token_data["access_token"]
            token_type = token_data.get("token_type", "bearer")
            token_scope = token_data.get("scope", "")

            # Get user information
            user_info = await UserAuthService.get_user_info(access_token)

            # Create user data
            user_create = UserCreate(
                github_id=user_info["id"],
                github_login=user_info["login"],
                email=user_info.get("email"),
                name=user_info.get("name"),
                avatar_url=user_info.get("avatar_url"),
                access_token=access_token,
                token_type=token_type,
                token_scope=token_scope,
            )

            # Create or update user in database
            user = await UserAuthService.create_or_update_user(user_create)

            # Sync installations in background (don't wait)
            await UserAuthService.sync_user_installations(user.github_id, access_token)

            # Return public user data
            return UserResponse(
                github_id=user.github_id,
                github_login=user.github_login,
                email=user.email,
                name=user.name,
                avatar_url=user.avatar_url,
                installations=user.installations,
                created_at=user.created_at,
                last_login=user.last_login,
            )

        except Exception as e:
            logger.error(f"Error handling OAuth callback: {e}", exc_info=True)
            raise
