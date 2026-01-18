"""Analysis orchestration service"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import logging

from app.core.database import MongoDB
from app.models.analysis import Analysis, AnalysisStatus
from app.services.github_service import GitHubService
from app.services.compression_service import CompressionService
from app.tasks.analysis_tasks import run_security_analysis

logger = logging.getLogger(__name__)


class AnalysisService:
    """Service for orchestrating security analysis"""

    @staticmethod
    async def trigger_analysis(
        repo_full_name: str,
        commit_sha: str,
        clone_url: str,
        pr_number: Optional[int] = None,
        user_settings: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Trigger a new security analysis

        Creates an analysis record and queues background task.
        If user_settings provided, the analysis will use the user's
        custom LLM API key and provider preference.
        """
        try:
            # Generate analysis ID
            analysis_id = f"analysis_{uuid.uuid4().hex[:12]}"

            # Create analysis record
            analysis = Analysis(
                id=analysis_id,
                repo_full_name=repo_full_name,
                commit_sha=commit_sha,
                status=AnalysisStatus.PENDING
            )

            # Save to database
            db = MongoDB.get_database()
            await db.analyses.insert_one(analysis.model_dump(mode='json'))

            logger.info(f"Created analysis {analysis_id} for {repo_full_name}@{commit_sha}")

            # Queue background task with user settings
            run_security_analysis.delay(
                analysis_id=analysis_id,
                repo_full_name=repo_full_name,
                commit_sha=commit_sha,
                clone_url=clone_url,
                pr_number=pr_number,
                user_settings=user_settings  # Pass user's LLM settings here
            )

            logger.info(f"Queued analysis task for {analysis_id}")

            return analysis_id

        except Exception as e:
            logger.error(f"Error triggering analysis: {e}", exc_info=True)
            raise

    @staticmethod
    async def get_analysis(analysis_id: str) -> Optional[Analysis]:
        """Get analysis by ID"""
        try:
            db = MongoDB.get_database()
            result = await db.analyses.find_one({"id": analysis_id})

            if result:
                return Analysis(**result)
            return None

        except Exception as e:
            logger.error(f"Error retrieving analysis: {e}", exc_info=True)
            raise

    @staticmethod
    async def get_repo_analyses(
        repo_full_name: str,
        limit: int = 10,
        offset: int = 0
    ) -> List[Analysis]:
        """Get analyses for a repository"""
        try:
            db = MongoDB.get_database()
            cursor = db.analyses.find(
                {"repo_full_name": repo_full_name}
            ).sort("created_at", -1).skip(offset).limit(limit)

            analyses = []
            async for doc in cursor:
                analyses.append(Analysis(**doc))

            return analyses

        except Exception as e:
            logger.error(f"Error retrieving repo analyses: {e}", exc_info=True)
            raise

    @staticmethod
    async def get_analysis_status(analysis_id: str) -> Optional[Dict[str, Any]]:
        """Get analysis status and metadata"""
        try:
            analysis = await AnalysisService.get_analysis(analysis_id)
            if not analysis:
                return None

            return {
                "id": analysis.id,
                "repo_full_name": analysis.repo_full_name,
                "commit_sha": analysis.commit_sha,
                "status": analysis.status,
                "created_at": analysis.created_at,
                "completed_at": analysis.completed_at,
                "pr_number": analysis.pr_number,
                "pr_url": analysis.pr_url
            }

        except Exception as e:
            logger.error(f"Error retrieving analysis status: {e}", exc_info=True)
            raise

    @staticmethod
    async def update_analysis(
        analysis_id: str,
        updates: Dict[str, Any]
    ):
        """Update analysis record"""
        try:
            db = MongoDB.get_database()
            await db.analyses.update_one(
                {"id": analysis_id},
                {"$set": updates}
            )
            logger.info(f"Updated analysis {analysis_id}")

        except Exception as e:
            logger.error(f"Error updating analysis: {e}", exc_info=True)
            raise
