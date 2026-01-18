"""Analysis status and results endpoints"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

from app.services.analysis_service import AnalysisService
from app.models.analysis import Analysis
from app.core.database import MongoDB

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/analysis/{analysis_id}", response_model=Analysis)
async def get_analysis(analysis_id: str):
    """
    Get analysis by ID

    Returns the complete analysis including status, findings, and results
    """
    try:
        analysis = await AnalysisService.get_analysis(analysis_id)
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        return analysis
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analysis/repo/{owner}/{repo}")
async def get_repo_analyses(
    owner: str,
    repo: str,
    limit: int = 10,
    offset: int = 0
):
    """
    Get all analyses for a repository

    Returns a paginated list of analyses for the specified repository
    """
    try:
        repo_full_name = f"{owner}/{repo}"
        analyses = await AnalysisService.get_repo_analyses(
            repo_full_name=repo_full_name,
            limit=limit,
            offset=offset
        )
        return {
            "repo": repo_full_name,
            "analyses": analyses,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        logger.error(f"Error retrieving repo analyses: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analysis/repo/{owner}/{repo}/commit/{commit_sha}")
async def get_analysis_by_commit(
    owner: str,
    repo: str,
    commit_sha: str
):
    """
    Get analysis for a specific commit
    
    Returns the analysis for the given repo and commit SHA.
    This enables real-time dashboard updates when viewing a specific commit.
    """
    try:
        repo_full_name = f"{owner}/{repo}"
        db = MongoDB.get_database()
        
        # Find analysis for this specific commit
        result = await db.analyses.find_one({
            "repo_full_name": repo_full_name,
            "commit_sha": commit_sha
        })
        
        if not result:
            return {
                "repo": repo_full_name,
                "commit_sha": commit_sha,
                "analysis": None,
                "message": "No analysis found for this commit"
            }
        
        analysis = Analysis(**result)
        return {
            "repo": repo_full_name,
            "commit_sha": commit_sha,
            "analysis": analysis
        }
        
    except Exception as e:
        logger.error(f"Error retrieving analysis by commit: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analysis/{analysis_id}/status")
async def get_analysis_status(analysis_id: str):
    """
    Get analysis status

    Returns just the status and basic metadata without full results
    """
    try:
        status = await AnalysisService.get_analysis_status(analysis_id)
        if not status:
            raise HTTPException(status_code=404, detail="Analysis not found")
        return status
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving analysis status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


from pydantic import BaseModel

class TriggerAnalysisRequest(BaseModel):
    repo_full_name: str
    commit_sha: str
    clone_url: str


@router.post("/analysis/trigger")
async def trigger_analysis(request: TriggerAnalysisRequest):
    """
    Manually trigger a security analysis for a repository at a specific commit.
    
    This endpoint allows the frontend to trigger an on-demand security audit
    without requiring a push event.
    """
    try:
        # Check if analysis already exists for this commit
        db = MongoDB.get_database()
        existing = await db.analyses.find_one({
            "repo_full_name": request.repo_full_name,
            "commit_sha": request.commit_sha
        })
        
        if existing:
            return {
                "status": "exists",
                "analysis_id": existing.get("id"),
                "message": "Analysis already exists for this commit"
            }
        
        # Trigger new analysis
        analysis_id = await AnalysisService.trigger_analysis(
            repo_full_name=request.repo_full_name,
            commit_sha=request.commit_sha,
            clone_url=request.clone_url
        )
        
        logger.info(f"Manually triggered analysis {analysis_id} for {request.repo_full_name}@{request.commit_sha[:7]}")
        
        return {
            "status": "triggered",
            "analysis_id": analysis_id,
            "message": "Security analysis has been triggered"
        }
        
    except Exception as e:
        logger.error(f"Error triggering analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to trigger analysis: {str(e)}")
