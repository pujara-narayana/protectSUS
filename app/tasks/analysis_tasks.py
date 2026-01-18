"""Celery tasks for security analysis"""

from typing import Optional
import asyncio
import logging
from datetime import datetime

from app.tasks.celery_app import celery_app
from app.services.github_service import GitHubService
from app.services.compression_service import CompressionService
from app.services.agents.orchestrator import AgentOrchestrator
from app.services.fix_service import FixService
from app.services.cache_service import RepositoryCacheService
from app.services.knowledge_graph_service import KnowledgeGraphService
from app.services.code_parser_service import CodeParserService
from app.core.database import MongoDB, connect_databases, disconnect_databases
from app.models.analysis import AnalysisStatus

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name='run_security_analysis')
def run_security_analysis(
    self,
    analysis_id: str,
    repo_full_name: str,
    commit_sha: str,
    clone_url: str,
    pr_number: Optional[int] = None
):
    """
    Run complete security analysis pipeline

    This is the main Celery task that orchestrates:
    1. Code retrieval from GitHub
    2. Code compression
    3. Multi-agent analysis
    4. Fix generation
    5. PR creation
    """
    logger.info(f"Starting analysis task for {analysis_id}")

    # Run async code in event loop
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(
        _run_analysis_async(
            analysis_id,
            repo_full_name,
            commit_sha,
            clone_url,
            pr_number
        )
    )


async def _run_analysis_async(
    analysis_id: str,
    repo_full_name: str,
    commit_sha: str,
    clone_url: str,
    pr_number: Optional[int]
):
    """Async implementation of analysis task"""
    github_service = GitHubService()
    compression_service = CompressionService()
    orchestrator = AgentOrchestrator()
    fix_service = FixService()

    repo_path = None

    try:
        # Connect to databases
        await connect_databases()

        # Update status to in_progress
        await _update_analysis_status(analysis_id, AnalysisStatus.IN_PROGRESS)

        # Step 1: Check cache for existing code files
        logger.info(f"Step 1: Checking cache for {repo_full_name}@{commit_sha[:7]}")
        code_files = await RepositoryCacheService.get_cached_code(repo_full_name, commit_sha)
        
        if code_files:
            logger.info(f"Cache hit! Using {len(code_files)} cached files")
            repo_path = None  # No cleanup needed
        else:
            # Clone repository
            logger.info(f"Cache miss. Cloning repository {repo_full_name}@{commit_sha}")
            repo_path = await github_service.clone_repository(
                repo_full_name=repo_full_name,
                commit_sha=commit_sha,
                clone_url=clone_url
            )

            # Step 2: Extract code files
            logger.info("Step 2: Extracting code files")
            code_files = await github_service.get_code_files(repo_path)
            
            # Cache for future use
            if code_files:
                await RepositoryCacheService.cache_code(repo_full_name, commit_sha, code_files)

        if not code_files:
            logger.warning("No code files found in repository")
            await _update_analysis_status(
                analysis_id,
                AnalysisStatus.COMPLETED,
                {
                    'completed_at': datetime.utcnow(),
                    'vulnerabilities': [],
                    'dependency_risks': [],
                    'summary': 'No code files found in repository.'
                }
            )
            return

        # Step 3: Parse and index codebase structure (skip if already indexed)
        logger.info("Step 3: Checking if codebase needs indexing")
        try:
            from app.core.database import RedisDB
            redis = RedisDB.get_client()
            index_key = f"indexed:{repo_full_name}:{commit_sha}"
            already_indexed = await redis.get(index_key)
            
            if already_indexed:
                logger.info("Step 3: Codebase already indexed for this commit, skipping")
            else:
                logger.info("Step 3: Parsing codebase structure")
                code_structure = await CodeParserService.parse_files(code_files)
                await KnowledgeGraphService.index_codebase(repo_full_name, code_structure)
                # Mark as indexed (TTL: 7 days)
                await redis.setex(index_key, 604800, "1")
                logger.info("Step 3: Indexed codebase in Neo4j")
        except Exception as e:
            logger.warning(f"Failed to index codebase: {e}")

        # Step 4: Compress code
        logger.info("Step 4: Compressing code")
        compression_result = await compression_service.compress_code(
            code_files=code_files,
            target_tokens=100000
        )

        # Step 4: Run multi-agent analysis
        logger.info("Step 4: Running multi-agent security analysis")
        analysis_result = await orchestrator.analyze(
            code=compression_result['compressed_code'],
            context={
                'repo_full_name': repo_full_name,
                'commit_sha': commit_sha,
                'file_mapping': compression_result['file_mapping'],
                'compression_ratio': compression_result['compression_ratio']
            }
        )

        # Step 5: Post analysis summary to PR or commit
        summary_comment = fix_service.generate_summary(
            analysis_result['vulnerabilities'],
            analysis_result['dependency_risks']
        )
        
        if pr_number:
            logger.info(f"Step 5: Posting analysis results to PR #{pr_number}")
            await github_service.add_pr_comment(
                repo_full_name=repo_full_name,
                pr_number=pr_number,
                comment=summary_comment
            )
        else:
            logger.info(f"Step 5: Posting analysis results to commit {commit_sha[:7]}")
            await github_service.add_commit_comment(
                repo_full_name=repo_full_name,
                commit_sha=commit_sha,
                comment=summary_comment
            )

        # Step 6: Generate fixes if vulnerabilities found
        pr_info = None
        if analysis_result['vulnerabilities']:
            logger.info(f"Step 6: Generating fixes for {len(analysis_result['vulnerabilities'])} vulnerabilities")

            fixes = await fix_service.generate_fixes(
                vulnerabilities=analysis_result['vulnerabilities'],
                code_files=code_files,
                repo_path=repo_path
            )

            if fixes:
                # Create PR with fixes
                logger.info("Step 7: Creating pull request with fixes")
                pr_info = await github_service.create_fix_pr(
                    repo_full_name=repo_full_name,
                    base_commit=commit_sha,
                    fixes=fixes,
                    analysis_summary=summary_comment,
                    source_pr_number=pr_number
                )
        else:
            logger.info("No vulnerabilities found, skipping fix generation")

        # Step 8: Update analysis with results
        logger.info("Step 8: Saving analysis results")
        await _update_analysis_status(
            analysis_id,
            AnalysisStatus.COMPLETED,
            {
                'vulnerabilities': analysis_result['vulnerabilities'],
                'dependency_risks': analysis_result['dependency_risks'],
                'agent_analyses': analysis_result['agent_analyses'],
                'debate_transcript': analysis_result.get('debate_transcript', []),
                'summary': analysis_result.get('summary', ''),
                'completed_at': datetime.utcnow(),
                'total_execution_time': analysis_result['total_execution_time'],
                'total_tokens_used': analysis_result['total_tokens_used'],
                'pr_number': pr_info['pr_number'] if pr_info else None,
                'pr_url': pr_info['pr_url'] if pr_info else None
            }
        )

        # Step 9: Save summary to Neo4j knowledge graph
        try:
            debate_highlights = [
                entry.get('reasoning', entry.get('summary', ''))
                for entry in analysis_result.get('debate_transcript', [])
                if entry.get('action') in ('analysis_complete', 'aggregation_complete')
            ]
            await KnowledgeGraphService.create_analysis_summary_node(
                analysis_id=analysis_id,
                repo_full_name=repo_full_name,
                summary=analysis_result.get('summary', ''),
                debate_highlights=debate_highlights
            )
            logger.info("Step 9: Saved analysis summary to Neo4j")
        except Exception as e:
            logger.warning(f"Failed to save summary to Neo4j: {e}")

        logger.info(f"Analysis {analysis_id} completed successfully")

        return {
            'analysis_id': analysis_id,
            'status': 'completed',
            'vulnerabilities_found': len(analysis_result['vulnerabilities']),
            'dependency_risks_found': len(analysis_result['dependency_risks']),
            'pr_created': pr_info is not None
        }

    except Exception as e:
        logger.error(f"Analysis {analysis_id} failed: {e}", exc_info=True)

        # Update status to failed
        await _update_analysis_status(
            analysis_id,
            AnalysisStatus.FAILED,
            {
                'completed_at': datetime.utcnow(),
                'error': str(e)
            }
        )

        raise

    finally:
        # Cleanup
        if repo_path:
            github_service.cleanup_repo(repo_path)

        # Disconnect from databases
        await disconnect_databases()


async def _update_analysis_status(
    analysis_id: str,
    status: AnalysisStatus,
    updates: dict = None
):
    """Update analysis status in database"""
    db = MongoDB.get_database()
    update_data = {'status': status}

    if updates:
        update_data.update(updates)

    await db.analyses.update_one(
        {'id': analysis_id},
        {'$set': update_data}
    )

    logger.info(f"Updated analysis {analysis_id} status to {status}")
