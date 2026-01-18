"""Background tasks for knowledge graph indexing"""

from celery import shared_task
import logging

from app.services.github_service import GitHubService
from app.services.knowledge_graph_service import KnowledgeGraphService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def trigger_graph_indexing_task(
    self,
    repo_full_name: str,
    commit_sha: str,
    clone_url: str
):
    """
    Background task to index a repository's codebase in the knowledge graph.
    
    This task:
    1. Clones the repository at the specified commit
    2. Extracts code structure (files, functions, classes)
    3. Indexes everything in Neo4j
    
    Args:
        repo_full_name: Full repository name (owner/repo)
        commit_sha: Commit SHA to index
        clone_url: Repository clone URL
    """
    import asyncio
    
    async def _index():
        logger.info(f"Starting graph indexing for {repo_full_name} at {commit_sha}")
        
        github_service = GitHubService()
        repo_path = None
        
        try:
            # Clone repository at specific commit
            repo_path = await github_service.clone_repository(
                repo_full_name,
                commit_sha,
                clone_url
            )
            
            # Get all code files
            code_files = await github_service.get_code_files(repo_path)
            
            if not code_files:
                logger.warning(f"No code files found in {repo_full_name}")
                return {"status": "completed", "files_indexed": 0}
            
            # Build code structure
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
            
            # Create repository node
            await KnowledgeGraphService.create_repository_node(
                repo_full_name,
                {"created_at": "now"}
            )
            
            # Index full codebase structure
            await KnowledgeGraphService.index_codebase(repo_full_name, code_structure)
            
            # Create file nodes for visualization
            await KnowledgeGraphService.create_file_nodes(repo_full_name, code_files)
            
            logger.info(f"Successfully indexed {len(code_files)} files for {repo_full_name}")
            
            return {
                "status": "completed",
                "repository": repo_full_name,
                "files_indexed": len(code_files)
            }
            
        except Exception as e:
            logger.error(f"Error indexing graph for {repo_full_name}: {e}", exc_info=True)
            raise self.retry(exc=e)
            
        finally:
            # Cleanup cloned repository
            if repo_path:
                github_service.cleanup_repo(repo_path)
    
    # Run async function in event loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_index())
    finally:
        loop.close()


@shared_task(bind=True, max_retries=2)
def reindex_all_user_repos_task(self, user_id: str):
    """
    Background task to reindex all repositories for a user.
    
    This is useful for initial setup or bulk reindexing.
    
    Args:
        user_id: GitHub user ID
    """
    import asyncio
    from app.core.database import MongoDB
    
    async def _reindex_all():
        logger.info(f"Starting bulk reindex for user {user_id}")
        
        try:
            db = MongoDB.get_database()
            user = await db.users.find_one({"github_id": int(user_id)})
            
            if not user:
                logger.warning(f"User {user_id} not found")
                return {"status": "failed", "error": "User not found"}
            
            repos = []
            for installation in user.get("installations", []):
                repos.extend(installation.get("repositories", []))
            
            if not repos:
                logger.info(f"No repositories found for user {user_id}")
                return {"status": "completed", "repos_indexed": 0}
            
            github_service = GitHubService()
            indexed_count = 0
            
            for repo_full_name in repos:
                try:
                    # Get latest commit from default branch
                    gh = github_service.get_installation_client(repo_full_name)
                    repo = gh.get_repo(repo_full_name)
                    default_branch = repo.default_branch
                    branch = repo.get_branch(default_branch)
                    commit_sha = branch.commit.sha
                    clone_url = repo.clone_url
                    
                    # Trigger individual indexing task
                    trigger_graph_indexing_task.delay(
                        repo_full_name=repo_full_name,
                        commit_sha=commit_sha,
                        clone_url=clone_url
                    )
                    indexed_count += 1
                    
                except Exception as repo_err:
                    logger.warning(f"Failed to queue indexing for {repo_full_name}: {repo_err}")
            
            logger.info(f"Queued indexing for {indexed_count} repositories for user {user_id}")
            
            return {
                "status": "completed",
                "repos_queued": indexed_count
            }
            
        except Exception as e:
            logger.error(f"Error in bulk reindex for user {user_id}: {e}", exc_info=True)
            raise self.retry(exc=e)
    
    # Run async function
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_reindex_all())
    finally:
        loop.close()
