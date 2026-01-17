"""User feedback endpoints for reinforcement learning"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import logging

from app.services.feedback_service import FeedbackService

logger = logging.getLogger(__name__)
router = APIRouter()


class FeedbackRequest(BaseModel):
    """User feedback request model"""
    analysis_id: str = Field(..., description="Analysis ID")
    approved: bool = Field(..., description="Whether the fix was approved")
    feedback_text: Optional[str] = Field(None, description="Optional feedback text")
    helpful_findings: Optional[list[str]] = Field(None, description="List of helpful finding IDs")
    unhelpful_findings: Optional[list[str]] = Field(None, description="List of unhelpful finding IDs")


@router.post("/feedback")
async def submit_feedback(feedback: FeedbackRequest):
    """
    Submit user feedback on an analysis and generated fix

    This feedback is used to train the reinforcement learning model
    """
    try:
        result = await FeedbackService.submit_feedback(
            analysis_id=feedback.analysis_id,
            approved=feedback.approved,
            feedback_text=feedback.feedback_text,
            helpful_findings=feedback.helpful_findings,
            unhelpful_findings=feedback.unhelpful_findings
        )
        return {
            "status": "success",
            "message": "Feedback recorded successfully",
            "feedback_id": result["feedback_id"]
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/feedback/{analysis_id}")
async def get_feedback(analysis_id: str):
    """
    Get feedback for a specific analysis
    """
    try:
        feedback = await FeedbackService.get_feedback(analysis_id)
        if not feedback:
            raise HTTPException(status_code=404, detail="Feedback not found")
        return feedback
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving feedback: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/feedback/stats")
async def get_feedback_stats():
    """
    Get aggregate feedback statistics

    Returns approval rate, most common issues, etc.
    """
    try:
        stats = await FeedbackService.get_feedback_stats()
        return stats
    except Exception as e:
        logger.error(f"Error retrieving feedback stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
