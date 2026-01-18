"""Knowledge Graph API endpoints"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
import logging

from app.services.knowledge_graph_service import KnowledgeGraphService
from app.services.user_auth_service import UserAuthService
from app.core.database import MongoDB

logger = logging.getLogger(__name__)
router = APIRouter()


async def verify_user_repo_access(user_id: str, repo_full_name: str) -> bool:
    """
    Verify that a user has access to a repository via their GitHub App installations.
    
    Args:
        user_id: GitHub user ID
        repo_full_name: Full repository name (owner/repo)
    
    Returns:
        True if user has access, False otherwise
    """
    try:
        db = MongoDB.get_database()
        user = await db.users.find_one({"github_id": int(user_id)})
        
        if not user:
            return False
        
        # Check if repo is in any of the user's installations
        for installation in user.get("installations", []):
            # Check by account (org/user owns the repo)
            repo_owner = repo_full_name.split("/")[0]
            if installation.get("account_login") == repo_owner:
                return True
            
            # Check by specific repository list
            if repo_full_name in installation.get("repositories", []):
                return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error verifying user access: {e}")
        return False


@router.get("/kg/{owner}/{repo}")
async def get_repo_knowledge_graph(
    owner: str,
    repo: str,
    user_id: Optional[str] = Query(None, description="GitHub user ID for authorization")
):
    """
    Get knowledge graph data for a repository.
    
    Returns nodes and edges representing the repository's security knowledge graph:
    - Repository node
    - File nodes
    - Vulnerability nodes
    - Dependency nodes
    - Analysis nodes with summaries
    
    Authorization: User must have access to the repository via GitHub App installation.
    """
    repo_full_name = f"{owner}/{repo}"
    
    # Verify user has access to this repo
    if user_id:
        has_access = await verify_user_repo_access(user_id, repo_full_name)
        if not has_access:
            raise HTTPException(
                status_code=403,
                detail="You do not have access to this repository's knowledge graph"
            )
    
    try:
        # Get graph data from Neo4j
        graph_data = await KnowledgeGraphService.get_repo_graph_data(repo_full_name)
        
        return {
            "repository": repo_full_name,
            "nodes": graph_data.get("nodes", []),
            "edges": graph_data.get("edges", []),
            "stats": graph_data.get("stats", {})
        }
        
    except Exception as e:
        logger.error(f"Error fetching knowledge graph: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve knowledge graph")


@router.get("/kg/{owner}/{repo}/vulnerabilities")
async def get_repo_vulnerabilities(
    owner: str,
    repo: str,
    severity: Optional[str] = Query(None, description="Filter by severity"),
    user_id: Optional[str] = Query(None, description="GitHub user ID for authorization")
):
    """
    Get vulnerabilities for a repository from the knowledge graph.
    """
    repo_full_name = f"{owner}/{repo}"
    
    if user_id:
        has_access = await verify_user_repo_access(user_id, repo_full_name)
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        vulnerabilities = await KnowledgeGraphService.get_repository_vulnerabilities(
            repo_full_name=repo_full_name,
            severity_filter=severity
        )
        
        return {
            "repository": repo_full_name,
            "vulnerabilities": vulnerabilities,
            "count": len(vulnerabilities)
        }
        
    except Exception as e:
        logger.error(f"Error fetching vulnerabilities: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve vulnerabilities")


@router.get("/kg/{owner}/{repo}/high-risk-files")
async def get_high_risk_files(
    owner: str,
    repo: str,
    min_vulnerabilities: int = Query(2, description="Minimum vulnerabilities to be considered high-risk"),
    user_id: Optional[str] = Query(None, description="GitHub user ID for authorization")
):
    """
    Get high-risk files (hotspots) for a repository.
    """
    repo_full_name = f"{owner}/{repo}"
    
    if user_id:
        has_access = await verify_user_repo_access(user_id, repo_full_name)
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        hotspots = await KnowledgeGraphService.get_high_risk_files(
            repo_full_name=repo_full_name,
            min_vulnerabilities=min_vulnerabilities
        )
        
        return {
            "repository": repo_full_name,
            "high_risk_files": hotspots,
            "count": len(hotspots)
        }
        
    except Exception as e:
        logger.error(f"Error fetching high-risk files: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve high-risk files")


@router.post("/kg/{owner}/{repo}/index")
async def trigger_knowledge_graph_indexing(
    owner: str,
    repo: str,
    user_id: Optional[str] = Query(None, description="GitHub user ID for authorization")
):
    """
    Trigger knowledge graph indexing for a repository.
    
    This will queue a background task to:
    1. Clone the repository at the latest commit
    2. Parse code structure (files, functions, classes)
    3. Index everything in Neo4j knowledge graph
    """
    from app.tasks.graph_tasks import trigger_graph_indexing_task
    from app.services.github_service import GitHubService
    
    repo_full_name = f"{owner}/{repo}"
    
    # Verify user has access if provided
    if user_id:
        has_access = await verify_user_repo_access(user_id, repo_full_name)
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Get repository info to get latest commit and clone URL
        github_service = GitHubService()
        gh = github_service.get_installation_client(repo_full_name)
        repo_obj = gh.get_repo(repo_full_name)
        default_branch = repo_obj.default_branch
        branch = repo_obj.get_branch(default_branch)
        commit_sha = branch.commit.sha
        clone_url = repo_obj.clone_url
        
        # Queue indexing task
        trigger_graph_indexing_task.delay(
            repo_full_name=repo_full_name,
            commit_sha=commit_sha,
            clone_url=clone_url
        )
        
        logger.info(f"Queued KG indexing for {repo_full_name}@{commit_sha[:7]}")
        
        return {
            "status": "queued",
            "repository": repo_full_name,
            "commit": commit_sha[:7],
            "message": "Knowledge graph indexing has been queued. This may take a few minutes."
        }
        
    except Exception as e:
        logger.error(f"Error triggering KG indexing: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to trigger indexing: {str(e)}")
