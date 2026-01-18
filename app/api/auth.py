"""GitHub OAuth authentication endpoints"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, RedirectResponse
from typing import Optional
import logging

from app.services.user_auth_service import UserAuthService
from app.models.user import UserResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/auth/login")
async def login(
    redirect_to: Optional[str] = Query(None, description="URL to redirect to after authentication")
):
    """
    Initiate GitHub OAuth login flow

    Redirects user to GitHub authorization page

    Query Parameters:
        redirect_to: Optional URL to redirect to after successful authentication
    """
    try:
        # Generate state parameter for CSRF protection (could include redirect_to)
        state = redirect_to if redirect_to else None

        # Get GitHub OAuth authorization URL
        auth_url = UserAuthService.get_authorization_url(state=state)

        logger.info("Redirecting user to GitHub OAuth authorization")

        # Redirect to GitHub
        return RedirectResponse(url=auth_url)

    except Exception as e:
        logger.error(f"Error initiating login: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to initiate authentication")


@router.get("/auth")
async def oauth_callback(
    code: Optional[str] = Query(None, description="Authorization code from GitHub"),
    state: Optional[str] = Query(None, description="State parameter for CSRF protection"),
    error: Optional[str] = Query(None, description="Error from GitHub OAuth"),
    error_description: Optional[str] = Query(None, description="Error description from GitHub"),
):
    """
    GitHub OAuth callback endpoint

    This endpoint is called by GitHub after user authorizes the application.
    It exchanges the authorization code for an access token and creates/updates the user.

    Query Parameters:
        code: Authorization code from GitHub (required for success)
        state: State parameter for CSRF validation
        error: Error code if authorization failed
        error_description: Description of error if authorization failed

    Returns:
        JSON response with user data on success, or error message on failure
    """
    # Check for OAuth errors
    if error:
        logger.warning(f"OAuth error: {error} - {error_description}")
        raise HTTPException(
            status_code=400,
            detail=f"GitHub OAuth error: {error_description or error}"
        )

    # Validate code parameter
    if not code:
        logger.warning("OAuth callback missing code parameter")
        raise HTTPException(
            status_code=400,
            detail="Missing authorization code"
        )

    try:
        # Handle OAuth callback and create/update user
        user = await UserAuthService.handle_oauth_callback(code, state)

        logger.info(f"User {user.github_login} authenticated successfully")

        # Return success response with user data
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "message": "Authentication successful",
                "user": {
                    "github_id": user.github_id,
                    "github_login": user.github_login,
                    "email": user.email,
                    "name": user.name,
                    "avatar_url": user.avatar_url,
                    "installations": [
                        {
                            "installation_id": inst.installation_id,
                            "account_login": inst.account_login,
                            "account_type": inst.account_type,
                        }
                        for inst in user.installations
                    ],
                }
            }
        )

    except Exception as e:
        logger.error(f"OAuth callback error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Authentication failed: {str(e)}"
        )


@router.get("/auth/status")
async def auth_status():
    """
    Get authentication status and configuration

    Returns information about the OAuth setup without requiring authentication
    """
    return {
        "oauth_enabled": True,
        "provider": "GitHub",
        "callback_url": UserAuthService.OAUTH_AUTHORIZE_URL,
        "login_url": "/auth/login",
    }
