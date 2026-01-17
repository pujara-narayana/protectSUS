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

        # Step 1: Clone repository
        logger.info(f"Step 1: Cloning repository {repo_full_name}@{commit_sha}")
        repo_path = await github_service.clone_repository(
            repo_full_name=repo_full_name,
            commit_sha=commit_sha,
            clone_url=clone_url
        )

        # Step 2: Extract code files
        logger.info("Step 2: Extracting code files")
        code_files = await github_service.get_code_files(repo_path)

        if not code_files:
            logger.warning("No code files found in repository")
            await _update_analysis_status(
                analysis_id,
                AnalysisStatus.COMPLETED,
                {
                    'completed_at': datetime.utcnow(),
                    'vulnerabilities': [],
                    'dependency_risks': []
                }
            )
            return

        # Step 3: Compress code
        logger.info("Step 3: Compressing code")
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

        # Step 5: Generate fixes if vulnerabilities found
        pr_info = None
        if analysis_result['vulnerabilities']:
            logger.info(f"Step 5: Generating fixes for {len(analysis_result['vulnerabilities'])} vulnerabilities")

            fixes = await fix_service.generate_fixes(
                vulnerabilities=analysis_result['vulnerabilities'],
                code_files=code_files,
                repo_path=repo_path
            )

            if fixes:
                # Create PR with fixes
                logger.info("Step 6: Creating pull request with fixes")
                pr_info = await github_service.create_fix_pr(
                    repo_full_name=repo_full_name,
                    base_commit=commit_sha,
                    fixes=fixes,
                    analysis_summary=fix_service.generate_summary(
                        analysis_result['vulnerabilities'],
                        analysis_result['dependency_risks']
                    )
                )
        else:
            logger.info("No vulnerabilities found, skipping fix generation")

        # Step 6: Update analysis with results
        logger.info("Step 7: Saving analysis results")
        await _update_analysis_status(
            analysis_id,
            AnalysisStatus.COMPLETED,
            {
                'vulnerabilities': analysis_result['vulnerabilities'],
                'dependency_risks': analysis_result['dependency_risks'],
                'agent_analyses': analysis_result['agent_analyses'],
                'completed_at': datetime.utcnow(),
                'total_execution_time': analysis_result['total_execution_time'],
                'total_tokens_used': analysis_result['total_tokens_used'],
                'pr_number': pr_info['pr_number'] if pr_info else None,
                'pr_url': pr_info['pr_url'] if pr_info else None
            }
        )

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
