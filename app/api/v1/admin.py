"""Admin and user settings API endpoints"""

from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime, timedelta

from app.core.database import MongoDB
from app.services.analysis_service import AnalysisService

logger = logging.getLogger(__name__)
router = APIRouter()


class UserSettings(BaseModel):
    """User settings model"""
    llm_provider: Optional[str] = None  # anthropic, openai, gemini, openrouter
    api_key: Optional[str] = None  # User's own API key (encrypted)


class AdminStats(BaseModel):
    """Admin dashboard statistics"""
    total_users: int
    total_analyses: int
    analyses_24h: int
    vulnerabilities_found: int


@router.get("/admin/stats")
async def get_admin_stats():
    """
    Get admin dashboard statistics.
    
    Returns real metrics from database:
    - Total registered users
    - Total analyses
    - Analyses in last 24 hours
    - Total vulnerabilities found
    """
    try:
        db = MongoDB.get_database()
        
        # Count total users
        total_users = await db.users.count_documents({})
        
        # Count total analyses
        total_analyses = await db.analyses.count_documents({})
        
        # Count analyses in last 24 hours
        twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
        analyses_24h = await db.analyses.count_documents({
            "created_at": {"$gte": twenty_four_hours_ago}
        })
        
        # Count total vulnerabilities across all analyses
        pipeline = [
            {"$unwind": {"path": "$vulnerabilities", "preserveNullAndEmptyArrays": False}},
            {"$count": "total"}
        ]
        vuln_result = await db.analyses.aggregate(pipeline).to_list(1)
        vulnerabilities_found = vuln_result[0]["total"] if vuln_result else 0
        
        # Calculate token spend (estimate based on analyses)
        token_pipeline = [
            {"$group": {"_id": None, "total": {"$sum": "$total_tokens_used"}}}
        ]
        token_result = await db.analyses.aggregate(token_pipeline).to_list(1)
        total_tokens = token_result[0]["total"] if token_result else 0
        # Rough estimate: $0.00001 per token
        monthly_token_spend = round(total_tokens * 0.00001, 2)
        
        return {
            "total_users": total_users,
            "total_analyses": total_analyses,
            "analyses_24h": analyses_24h,
            "vulnerabilities_found": vulnerabilities_found,
            "monthly_token_spend": monthly_token_spend
        }
        
    except Exception as e:
        logger.error(f"Error fetching admin stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics")


@router.get("/admin/users")
async def get_all_users(
    limit: int = Query(50, description="Limit number of users returned"),
    offset: int = Query(0, description="Offset for pagination")
):
    """
    Get list of all registered users.
    
    Returns users with:
    - Username/login
    - Last active timestamp
    - Number of repos connected
    """
    try:
        db = MongoDB.get_database()
        
        users = await db.users.find(
            {},
            {"github_login": 1, "github_id": 1, "last_active": 1, "created_at": 1, "installations": 1}
        ).sort("last_active", -1).skip(offset).limit(limit).to_list(limit)
        
        user_list = []
        for user in users:
            last_active = user.get("last_active") or user.get("created_at")
            installations = user.get("installations", [])
            repo_count = sum(len(inst.get("repositories", [])) for inst in installations)
            
            user_list.append({
                "username": user.get("github_login", f"user_{user.get('github_id')}"),
                "github_id": user.get("github_id"),
                "last_active": last_active.isoformat() if last_active else None,
                "repo_count": repo_count
            })
        
        total_count = await db.users.count_documents({})
        
        return {
            "users": user_list,
            "total": total_count,
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Error fetching users: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve users")


@router.get("/admin/analyses")
async def get_recent_analyses(
    limit: int = Query(20, description="Limit number of analyses returned"),
    offset: int = Query(0, description="Offset for pagination")
):
    """
    Get list of recent analyses for admin dashboard.
    """
    try:
        db = MongoDB.get_database()
        
        analyses = await db.analyses.find(
            {},
            {
                "id": 1, 
                "repo_full_name": 1, 
                "commit_sha": 1, 
                "status": 1, 
                "created_at": 1,
                "vulnerabilities": 1,
                "summary": 1
            }
        ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
        
        result = []
        for analysis in analyses:
            created_at = analysis.get("created_at")
            time_ago = "Unknown"
            if created_at:
                delta = datetime.utcnow() - created_at
                if delta.seconds < 60:
                    time_ago = f"{delta.seconds}s ago"
                elif delta.seconds < 3600:
                    time_ago = f"{delta.seconds // 60}m ago"
                elif delta.days == 0:
                    time_ago = f"{delta.seconds // 3600}h ago"
                else:
                    time_ago = f"{delta.days}d ago"
            
            result.append({
                "id": analysis.get("id") or str(analysis.get("_id")),
                "repo": analysis.get("repo_full_name"),
                "commit": analysis.get("commit_sha", "")[:7],
                "status": analysis.get("status", "unknown").upper(),
                "timestamp": time_ago,
                "vuln_count": len(analysis.get("vulnerabilities", []))
            })
        
        return {"analyses": result}
        
    except Exception as e:
        logger.error(f"Error fetching analyses: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve analyses")


@router.get("/admin/system-health")
async def get_system_health():
    """
    Get system health status for all services.
    """
    from app.core.database import Neo4jDB
    import redis
    
    health = []
    
    # Check FastAPI (always healthy if we're here)
    health.append({"name": "FastAPI Backend", "status": "Healthy", "healthy": True})
    
    # Check MongoDB
    try:
        db = MongoDB.get_database()
        await db.command("ping")
        health.append({"name": "MongoDB", "status": "Healthy", "healthy": True})
    except Exception as e:
        health.append({"name": "MongoDB", "status": f"Error: {str(e)[:30]}", "healthy": False})
    
    # Check Neo4j
    try:
        driver = Neo4jDB.get_driver()
        async with driver.session() as session:
            await session.run("RETURN 1")
        health.append({"name": "Neo4j", "status": "Healthy", "healthy": True})
    except Exception as e:
        health.append({"name": "Neo4j", "status": f"Error: {str(e)[:30]}", "healthy": False})
    
    # Check Redis
    try:
        from app.core.config import settings
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        health.append({"name": "Redis", "status": "Healthy", "healthy": True})
    except Exception as e:
        health.append({"name": "Redis", "status": f"Error: {str(e)[:30]}", "healthy": False})
    
    # Check Celery workers (via Redis)
    try:
        from celery import current_app
        inspect = current_app.control.inspect()
        active = inspect.active()
        worker_count = len(active) if active else 0
        health.append({"name": "Celery Workers", "status": f"{worker_count} Online", "healthy": worker_count > 0})
    except Exception as e:
        health.append({"name": "Celery Workers", "status": "Unknown", "healthy": True})
    
    # Check LLM API
    try:
        from app.core.config import settings
        if settings.ANTHROPIC_API_KEY:
            health.append({"name": "Anthropic API", "status": "Configured", "healthy": True})
        elif settings.OPENAI_API_KEY:
            health.append({"name": "OpenAI API", "status": "Configured", "healthy": True})
        else:
            health.append({"name": "LLM API", "status": "Not Configured", "healthy": False})
    except Exception:
        health.append({"name": "LLM API", "status": "Unknown", "healthy": True})
    
    return {"services": health}


# User settings endpoints
@router.get("/user/settings")
async def get_user_settings(
    user_id: str = Query(..., description="GitHub user ID")
):
    """
    Get user settings including LLM provider preferences.
    """
    try:
        db = MongoDB.get_database()
        user = await db.users.find_one({"github_id": int(user_id)})
        
        if not user:
            return {
                "llm_provider": None,
                "has_api_key": False,
                "available_providers": ["anthropic", "openai", "gemini", "openrouter"]
            }
        
        settings = user.get("settings", {})
        
        return {
            "llm_provider": settings.get("llm_provider"),
            "has_api_key": bool(settings.get("api_key")),
            "available_providers": ["anthropic", "openai", "gemini", "openrouter"]
        }
        
    except Exception as e:
        logger.error(f"Error fetching user settings: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve settings")


@router.post("/user/settings")
async def update_user_settings(
    user_id: str = Query(..., description="GitHub user ID"),
    settings: UserSettings = Body(...)
):
    """
    Update user settings including LLM provider and API key.
    """
    try:
        db = MongoDB.get_database()
        
        update_data = {}
        if settings.llm_provider:
            update_data["settings.llm_provider"] = settings.llm_provider
        if settings.api_key:
            # In production, encrypt this
            update_data["settings.api_key"] = settings.api_key
        
        result = await db.users.update_one(
            {"github_id": int(user_id)},
            {"$set": update_data},
            upsert=False
        )
        
        if result.modified_count == 0 and result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"success": True, "message": "Settings updated"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user settings: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update settings")


@router.delete("/user/settings/api-key")
async def delete_user_api_key(
    user_id: str = Query(..., description="GitHub user ID")
):
    """
    Remove user's custom API key.
    """
    try:
        db = MongoDB.get_database()
        
        await db.users.update_one(
            {"github_id": int(user_id)},
            {"$unset": {"settings.api_key": ""}}
        )
        
        return {"success": True, "message": "API key removed"}
        
    except Exception as e:
        logger.error(f"Error removing API key: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to remove API key")
