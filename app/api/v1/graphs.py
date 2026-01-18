"""Graphs API endpoints for multi-repository knowledge graph operations"""

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from typing import Optional, List, Dict, Any
import logging
import asyncio
import json

from app.services.knowledge_graph_service import KnowledgeGraphService
from app.services.github_service import GitHubService
from app.core.database import MongoDB

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory event store for SSE (in production, use Redis pub/sub)
graph_update_events: Dict[str, List[Dict[str, Any]]] = {}


async def get_user_installations(user_id: str) -> List[Dict[str, Any]]:
    """
    Get all GitHub App installations for a user.
    
    Returns list of installations with repository info.
    """
    try:
        db = MongoDB.get_database()
        user = await db.users.find_one({"github_id": int(user_id)})
        
        if not user:
            return []
        
        return user.get("installations", [])
        
    except Exception as e:
        logger.error(f"Error getting user installations: {e}")
        return []


async def get_user_repos_from_installations(user_id: str) -> List[str]:
    """
    Get all repository full names from user's installations.
    """
    installations = await get_user_installations(user_id)
    repos = []
    
    for installation in installations:
        # Get repos from installation
        repos.extend(installation.get("repositories", []))
    
    return repos


@router.get("/graphs/user")
async def get_user_repos_with_graph_status(
    user_id: str = Query(..., description="GitHub user ID")
):
    """
    Get all user repositories with their graph indexing status.
    
    Returns list of repos with:
    - Repository name
    - Graph indexed status
    - Node count
    - Last indexed timestamp
    """
    try:
        repos = await get_user_repos_from_installations(user_id)
        
        if not repos:
            return {
                "repositories": [],
                "message": "No repositories found. Please install the GitHub App on your repositories."
            }
        
        result = []
        for repo_full_name in repos:
            # Get graph data to check status
            graph_data = await KnowledgeGraphService.get_repo_graph_data(repo_full_name)
            
            node_count = graph_data.get("stats", {}).get("total_nodes", 0)
            is_indexed = node_count > 0
            
            result.append({
                "full_name": repo_full_name,
                "name": repo_full_name.split("/")[-1],
                "owner": repo_full_name.split("/")[0],
                "is_indexed": is_indexed,
                "node_count": node_count,
                "stats": graph_data.get("stats", {})
            })
        
        return {
            "repositories": result,
            "total": len(result),
            "indexed_count": len([r for r in result if r["is_indexed"]])
        }
        
    except Exception as e:
        logger.error(f"Error getting user repos with graph status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve repositories")


@router.get("/graphs/all")
async def get_all_repos_combined_graph(
    user_id: str = Query(..., description="GitHub user ID"),
    limit_per_repo: int = Query(50, description="Max nodes per repository")
):
    """
    Get combined knowledge graph data for all user repositories.
    
    Returns unified graph with nodes and edges from all repos.
    """
    try:
        repos = await get_user_repos_from_installations(user_id)
        
        if not repos:
            return {
                "nodes": [],
                "edges": [],
                "stats": {"total_nodes": 0, "total_edges": 0, "repositories": 0}
            }
        
        all_nodes = []
        all_edges = []
        repo_stats = []
        
        for repo_full_name in repos:
            graph_data = await KnowledgeGraphService.get_repo_graph_data(repo_full_name)
            
            # Add nodes with limited count per repo
            nodes = graph_data.get("nodes", [])[:limit_per_repo]
            all_nodes.extend(nodes)
            
            # Add edges only for included nodes
            node_ids = {n["id"] for n in nodes}
            edges = [
                e for e in graph_data.get("edges", [])
                if e["source"] in node_ids and e["target"] in node_ids
            ]
            all_edges.extend(edges)
            
            repo_stats.append({
                "repo": repo_full_name,
                "stats": graph_data.get("stats", {})
            })
        
        combined_stats = {
            "total_nodes": len(all_nodes),
            "total_edges": len(all_edges),
            "repositories": len(repos),
            "files": sum(s["stats"].get("files", 0) for s in repo_stats),
            "vulnerabilities": sum(s["stats"].get("vulnerabilities", 0) for s in repo_stats),
            "dependencies": sum(s["stats"].get("dependencies", 0) for s in repo_stats),
            "analyses": sum(s["stats"].get("analyses", 0) for s in repo_stats)
        }
        
        return {
            "nodes": all_nodes,
            "edges": all_edges,
            "stats": combined_stats,
            "repo_breakdown": repo_stats
        }
        
    except Exception as e:
        logger.error(f"Error getting combined graph: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve combined graph")


@router.post("/graphs/{owner}/{repo}/index")
async def trigger_graph_indexing(
    owner: str,
    repo: str,
    user_id: str = Query(..., description="GitHub user ID")
):
    """
    Trigger knowledge graph indexing for a specific repository.
    
    This will:
    1. Fetch the latest code structure
    2. Index files, functions, classes, and relationships in Neo4j
    """
    repo_full_name = f"{owner}/{repo}"
    
    # Verify user has access
    repos = await get_user_repos_from_installations(user_id)
    if repo_full_name not in repos:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this repository"
        )
    
    try:
        # Get repository and clone latest
        github_service = GitHubService()
        gh = github_service.get_installation_client(repo_full_name)
        repo_obj = gh.get_repo(repo_full_name)
        
        # Get default branch's latest commit
        default_branch = repo_obj.default_branch
        branch = repo_obj.get_branch(default_branch)
        commit_sha = branch.commit.sha
        
        # Clone repository
        clone_url = repo_obj.clone_url
        repo_path = await github_service.clone_repository(
            repo_full_name,
            commit_sha,
            clone_url
        )
        
        try:
            # Get code files
            code_files = await github_service.get_code_files(repo_path)
            
            # Create basic code structure for indexing
            code_structure = {
                "files": [
                    {
                        "path": f["path"],
                        "language": f["extension"].lstrip(".") if f.get("extension") else "unknown",
                        "line_count": f["content"].count("\n") + 1 if f.get("content") else 0
                    }
                    for f in code_files
                ],
                "functions": [],
                "classes": [],
                "imports": [],
                "calls": []
            }
            
            # Index in Neo4j
            await KnowledgeGraphService.index_codebase(repo_full_name, code_structure)
            
            # Also create file nodes for visualization
            await KnowledgeGraphService.create_file_nodes(repo_full_name, code_files)
            
            # Notify SSE subscribers
            await notify_graph_update(user_id, repo_full_name, "indexed")
            
            return {
                "success": True,
                "repository": repo_full_name,
                "files_indexed": len(code_files),
                "message": f"Successfully indexed {len(code_files)} files"
            }
            
        finally:
            # Cleanup
            github_service.cleanup_repo(repo_path)
        
    except Exception as e:
        logger.error(f"Error indexing repository: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to index repository: {str(e)}")


async def notify_graph_update(user_id: str, repo_full_name: str, event_type: str):
    """Add graph update event for SSE subscribers."""
    if user_id not in graph_update_events:
        graph_update_events[user_id] = []
    
    graph_update_events[user_id].append({
        "type": event_type,
        "repository": repo_full_name,
        "timestamp": asyncio.get_event_loop().time()
    })
    
    # Keep only last 100 events per user
    if len(graph_update_events[user_id]) > 100:
        graph_update_events[user_id] = graph_update_events[user_id][-100:]


async def event_generator(user_id: str):
    """Generate SSE events for graph updates."""
    last_index = 0
    
    while True:
        events = graph_update_events.get(user_id, [])
        
        if len(events) > last_index:
            for event in events[last_index:]:
                yield f"data: {json.dumps(event)}\n\n"
            last_index = len(events)
        
        # Send heartbeat every 30 seconds
        yield f": heartbeat\n\n"
        await asyncio.sleep(30)


@router.get("/graphs/events")
async def graph_events_sse(
    user_id: str = Query(..., description="GitHub user ID")
):
    """
    Server-Sent Events endpoint for real-time graph updates.
    
    Subscribe to receive notifications when graphs are updated.
    """
    return StreamingResponse(
        event_generator(user_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/graphs/{owner}/{repo}")
async def get_single_repo_graph(
    owner: str,
    repo: str,
    user_id: Optional[str] = Query(None, description="GitHub user ID for authorization")
):
    """
    Get knowledge graph data for a single repository.
    
    Same as /api/v1/kg/{owner}/{repo} but under the graphs namespace.
    """
    repo_full_name = f"{owner}/{repo}"
    
    # Verify access if user_id provided
    if user_id:
        repos = await get_user_repos_from_installations(user_id)
        if repo_full_name not in repos:
            raise HTTPException(
                status_code=403,
                detail="You do not have access to this repository's knowledge graph"
            )
    
    try:
        graph_data = await KnowledgeGraphService.get_repo_graph_data(repo_full_name)
        
        return {
            "repository": repo_full_name,
            "nodes": graph_data.get("nodes", []),
            "edges": graph_data.get("edges", []),
            "stats": graph_data.get("stats", {})
        }
        
    except Exception as e:
        logger.error(f"Error fetching graph for {repo_full_name}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve knowledge graph")
