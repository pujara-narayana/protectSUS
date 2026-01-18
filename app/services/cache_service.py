"""Repository code caching service using Redis"""

from typing import Optional, List, Dict, Any
import json
import logging

from app.core.database import RedisDB

logger = logging.getLogger(__name__)


class RepositoryCacheService:
    """Service for caching repository code in Redis to avoid repeated cloning"""
    
    CACHE_TTL = 3600  # 1 hour default TTL
    CACHE_PREFIX = "repo_cache"
    
    @staticmethod
    def _get_cache_key(repo_full_name: str, commit_sha: str) -> str:
        """Generate cache key for a repository at a specific commit"""
        return f"{RepositoryCacheService.CACHE_PREFIX}:{repo_full_name}:{commit_sha}"
    
    @staticmethod
    async def get_cached_code(
        repo_full_name: str, 
        commit_sha: str
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Retrieve cached code files for a repository at a specific commit.
        
        Returns:
            List of code file dicts if cache hit, None if cache miss
        """
        try:
            redis = RedisDB.get_client()
            cache_key = RepositoryCacheService._get_cache_key(repo_full_name, commit_sha)
            
            cached_data = await redis.get(cache_key)
            
            if cached_data:
                logger.info(f"Cache hit for {repo_full_name}@{commit_sha[:7]}")
                return json.loads(cached_data)
            
            logger.info(f"Cache miss for {repo_full_name}@{commit_sha[:7]}")
            return None
            
        except Exception as e:
            logger.warning(f"Cache lookup failed: {e}")
            return None
    
    @staticmethod
    async def cache_code(
        repo_full_name: str, 
        commit_sha: str, 
        code_files: List[Dict[str, Any]],
        ttl: int = None
    ) -> bool:
        """
        Cache code files for a repository at a specific commit.
        
        Args:
            repo_full_name: Full repository name (owner/repo)
            commit_sha: Git commit SHA
            code_files: List of code file dicts with 'path' and 'content'
            ttl: Time to live in seconds (default: 1 hour)
            
        Returns:
            True if cached successfully, False otherwise
        """
        try:
            redis = RedisDB.get_client()
            cache_key = RepositoryCacheService._get_cache_key(repo_full_name, commit_sha)
            cache_ttl = ttl or RepositoryCacheService.CACHE_TTL
            
            # Serialize code files to JSON
            cache_data = json.dumps(code_files)
            
            await redis.setex(cache_key, cache_ttl, cache_data)
            
            logger.info(
                f"Cached {len(code_files)} files for {repo_full_name}@{commit_sha[:7]} "
                f"(TTL: {cache_ttl}s)"
            )
            return True
            
        except Exception as e:
            logger.warning(f"Failed to cache code: {e}")
            return False
    
    @staticmethod
    async def invalidate_cache(repo_full_name: str) -> int:
        """
        Invalidate all cached versions of a repository.
        
        Args:
            repo_full_name: Full repository name (owner/repo)
            
        Returns:
            Number of cache entries deleted
        """
        try:
            redis = RedisDB.get_client()
            pattern = f"{RepositoryCacheService.CACHE_PREFIX}:{repo_full_name}:*"
            
            # Find all matching keys
            keys = []
            async for key in redis.scan_iter(match=pattern):
                keys.append(key)
            
            if keys:
                deleted = await redis.delete(*keys)
                logger.info(f"Invalidated {deleted} cache entries for {repo_full_name}")
                return deleted
            
            return 0
            
        except Exception as e:
            logger.warning(f"Failed to invalidate cache: {e}")
            return 0
    
    @staticmethod
    async def get_cache_stats() -> Dict[str, Any]:
        """Get cache statistics for monitoring"""
        try:
            redis = RedisDB.get_client()
            
            # Count cached repositories
            pattern = f"{RepositoryCacheService.CACHE_PREFIX}:*"
            count = 0
            async for _ in redis.scan_iter(match=pattern):
                count += 1
            
            return {
                "cached_repositories": count,
                "cache_prefix": RepositoryCacheService.CACHE_PREFIX,
                "default_ttl": RepositoryCacheService.CACHE_TTL
            }
            
        except Exception as e:
            logger.warning(f"Failed to get cache stats: {e}")
            return {"error": str(e)}
