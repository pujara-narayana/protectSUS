"""User feedback service for reinforcement learning"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import logging

from app.core.database import MongoDB
from app.services.rl_service import RLService

logger = logging.getLogger(__name__)


class FeedbackService:
    """Service for collecting and processing user feedback"""

    @staticmethod
    async def submit_feedback(
        analysis_id: str,
        approved: bool,
        feedback_text: Optional[str] = None,
        helpful_findings: Optional[List[str]] = None,
        unhelpful_findings: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Submit user feedback on an analysis

        Args:
            analysis_id: ID of the analysis
            approved: Whether the user approved the fix
            feedback_text: Optional feedback text
            helpful_findings: List of helpful finding IDs
            unhelpful_findings: List of unhelpful finding IDs

        Returns:
            Dictionary with feedback ID
        """
        try:
            db = MongoDB.get_database()

            # Verify analysis exists
            analysis = await db.analyses.find_one({'id': analysis_id})
            if not analysis:
                raise ValueError(f"Analysis {analysis_id} not found")

            # Create feedback record
            feedback_id = f"feedback_{uuid.uuid4().hex[:12]}"
            feedback = {
                'id': feedback_id,
                'analysis_id': analysis_id,
                'approved': approved,
                'feedback_text': feedback_text,
                'helpful_findings': helpful_findings or [],
                'unhelpful_findings': unhelpful_findings or [],
                'created_at': datetime.utcnow()
            }

            # Save feedback
            await db.user_feedback.insert_one(feedback)

            # Update analysis with feedback
            await db.analyses.update_one(
                {'id': analysis_id},
                {
                    '$set': {
                        'user_approved': approved,
                        'user_feedback': feedback_text
                    }
                }
            )

            logger.info(f"Feedback {feedback_id} submitted for analysis {analysis_id}")

            # Trigger RL model update
            try:
                rl_service = RLService()
                await rl_service.update_model_with_feedback(analysis, feedback)
            except Exception as e:
                logger.warning(f"RL model update failed: {e}")

            return {'feedback_id': feedback_id}

        except Exception as e:
            logger.error(f"Error submitting feedback: {e}", exc_info=True)
            raise

    @staticmethod
    async def get_feedback(analysis_id: str) -> Optional[Dict[str, Any]]:
        """Get feedback for an analysis"""
        try:
            db = MongoDB.get_database()
            feedback = await db.user_feedback.find_one({'analysis_id': analysis_id})
            return feedback
        except Exception as e:
            logger.error(f"Error retrieving feedback: {e}", exc_info=True)
            raise

    @staticmethod
    async def get_feedback_stats() -> Dict[str, Any]:
        """Get aggregate feedback statistics"""
        try:
            db = MongoDB.get_database()

            # Count total feedback
            total_feedback = await db.user_feedback.count_documents({})

            # Count approved vs rejected
            approved_count = await db.user_feedback.count_documents({'approved': True})
            rejected_count = await db.user_feedback.count_documents({'approved': False})

            # Calculate approval rate
            approval_rate = (approved_count / total_feedback * 100) if total_feedback > 0 else 0

            # Get recent feedback
            cursor = db.user_feedback.find().sort('created_at', -1).limit(10)
            recent_feedback = await cursor.to_list(length=10)

            return {
                'total_feedback': total_feedback,
                'approved_count': approved_count,
                'rejected_count': rejected_count,
                'approval_rate': approval_rate,
                'recent_feedback': recent_feedback
            }

        except Exception as e:
            logger.error(f"Error retrieving feedback stats: {e}", exc_info=True)
            raise
