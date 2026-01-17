"""GitHub webhook endpoints"""

from fastapi import APIRouter, Request, HTTPException, Header
from typing import Optional
import hmac
import hashlib
import logging

from app.core.config import settings
from app.models.webhook import PushEvent, PullRequestEvent
from app.services.analysis_service import AnalysisService

logger = logging.getLogger(__name__)
router = APIRouter()


def verify_github_signature(payload: bytes, signature: str) -> bool:
    """Verify GitHub webhook signature"""
    if not signature:
        return False

    try:
        sha_name, github_signature = signature.split('=')
        if sha_name != 'sha256':
            return False

        mac = hmac.new(
            settings.GITHUB_WEBHOOK_SECRET.encode(),
            msg=payload,
            digestmod=hashlib.sha256
        )
        expected_signature = mac.hexdigest()

        return hmac.compare_digest(expected_signature, github_signature)
    except Exception as e:
        logger.error(f"Signature verification error: {e}")
        return False


@router.post("/webhooks/github")
async def github_webhook(
    request: Request,
    x_github_event: Optional[str] = Header(None),
    x_hub_signature_256: Optional[str] = Header(None)
):
    """
    Handle GitHub webhook events

    Supported events:
    - push: Trigger analysis on push to main branch
    - pull_request: Trigger analysis on PR open/update
    """
    # Get raw payload for signature verification
    payload = await request.body()

    # Verify webhook signature
    if not verify_github_signature(payload, x_hub_signature_256):
        logger.warning("Invalid webhook signature")
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Parse JSON payload
    data = await request.json()

    logger.info(f"Received GitHub webhook event: {x_github_event}")

    try:
        if x_github_event == "push":
            event = PushEvent(**data)
            if event.is_main_branch():
                logger.info(f"Processing push to main branch: {event.repository.full_name}")
                analysis_id = await AnalysisService.trigger_analysis(
                    repo_full_name=event.repository.full_name,
                    commit_sha=event.after,
                    clone_url=event.repository.clone_url
                )
                return {
                    "status": "accepted",
                    "analysis_id": analysis_id,
                    "message": "Analysis triggered for push event"
                }
            else:
                return {
                    "status": "ignored",
                    "message": "Push event not on main branch"
                }

        elif x_github_event == "pull_request":
            event = PullRequestEvent(**data)
            if event.is_opened_or_synchronized():
                logger.info(f"Processing PR event: {event.repository.full_name} #{event.number}")
                analysis_id = await AnalysisService.trigger_analysis(
                    repo_full_name=event.repository.full_name,
                    commit_sha=event.pull_request["head"]["sha"],
                    clone_url=event.repository.clone_url,
                    pr_number=event.number
                )
                return {
                    "status": "accepted",
                    "analysis_id": analysis_id,
                    "message": "Analysis triggered for pull request"
                }
            else:
                return {
                    "status": "ignored",
                    "message": f"PR action '{event.action}' not supported"
                }

        else:
            return {
                "status": "ignored",
                "message": f"Event type '{x_github_event}' not supported"
            }

    except Exception as e:
        logger.error(f"Error processing webhook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing webhook: {str(e)}")


@router.get("/webhooks/test")
async def test_webhook():
    """Test endpoint to verify webhook service is running"""
    return {
        "status": "ok",
        "message": "Webhook service is running"
    }
