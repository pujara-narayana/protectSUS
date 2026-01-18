"""Celery tasks for PR approval/denial workflow"""

import asyncio
import logging
from typing import Optional

from app.tasks.celery_app import celery_app
from app.services.pr_workflow_service import PRWorkflowService
from app.core.database import connect_databases, disconnect_databases

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name='handle_pr_approval')
def handle_pr_approval(
    self,
    repo_full_name: str,
    pr_number: int,
    commenter: str
):
    """
    Process PR approval asynchronously

    Args:
        repo_full_name: Full repository name (owner/repo)
        pr_number: PR number
        commenter: GitHub username who approved
    """
    logger.info(f"Starting PR approval task for {repo_full_name} PR #{pr_number}")

    # Run async code in event loop
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(
        _handle_pr_approval_async(
            repo_full_name,
            pr_number,
            commenter
        )
    )


async def _handle_pr_approval_async(
    repo_full_name: str,
    pr_number: int,
    commenter: str
):
    """Async implementation of PR approval workflow"""
    try:
        # Ensure database is connected
        await connect_databases()

        # Execute approval workflow
        result = await PRWorkflowService.handle_approve(
            repo_full_name=repo_full_name,
            pr_number=pr_number,
            commenter=commenter
        )

        logger.info(f"PR approval workflow completed: {result}")
        return result

    except Exception as e:
        logger.error(f"Error in PR approval workflow: {e}", exc_info=True)
        return {
            'success': False,
            'reason': 'internal_error',
            'message': str(e)
        }
    finally:
        await disconnect_databases()


@celery_app.task(bind=True, name='handle_pr_denial')
def handle_pr_denial(
    self,
    repo_full_name: str,
    pr_number: int,
    feedback_text: str,
    commenter: str
):
    """
    Process PR denial and queue regeneration asynchronously

    Args:
        repo_full_name: Full repository name (owner/repo)
        pr_number: PR number
        feedback_text: User's feedback text
        commenter: GitHub username who denied
    """
    logger.info(f"Starting PR denial task for {repo_full_name} PR #{pr_number}")

    # Run async code in event loop
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(
        _handle_pr_denial_async(
            repo_full_name,
            pr_number,
            feedback_text,
            commenter
        )
    )


async def _handle_pr_denial_async(
    repo_full_name: str,
    pr_number: int,
    feedback_text: str,
    commenter: str
):
    """Async implementation of PR denial workflow"""
    try:
        # Ensure database is connected
        await connect_databases()

        # Execute denial workflow
        result = await PRWorkflowService.handle_deny(
            repo_full_name=repo_full_name,
            pr_number=pr_number,
            feedback_text=feedback_text,
            commenter=commenter
        )

        logger.info(f"PR denial workflow completed: {result}")

        # If denial was successful, queue regeneration task
        if result.get('success') and result.get('regeneration_queued'):
            analysis_id = result.get('analysis_id')
            iteration_number = result.get('iteration_number', 1)

            logger.info(
                f"Queueing fix regeneration for analysis {analysis_id}, "
                f"iteration {iteration_number} -> {iteration_number + 1}"
            )

            # Queue regeneration task
            regenerate_fix_with_feedback.delay(
                analysis_id=analysis_id,
                old_pr_number=pr_number,
                feedback_text=feedback_text,
                iteration_number=iteration_number + 1
            )

        return result

    except Exception as e:
        logger.error(f"Error in PR denial workflow: {e}", exc_info=True)
        return {
            'success': False,
            'reason': 'internal_error',
            'message': str(e)
        }
    finally:
        await disconnect_databases()


@celery_app.task(bind=True, name='regenerate_fix_with_feedback')
def regenerate_fix_with_feedback(
    self,
    analysis_id: str,
    old_pr_number: int,
    feedback_text: str,
    iteration_number: int
):
    """
    Regenerate fix with RL guidance and user feedback

    Args:
        analysis_id: ID of the analysis to refine
        old_pr_number: PR number to close after new PR is created
        feedback_text: User's feedback text
        iteration_number: New iteration number
    """
    logger.info(
        f"Starting fix regeneration for analysis {analysis_id}, "
        f"iteration {iteration_number}"
    )

    # Run async code in event loop
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(
        _regenerate_fix_async(
            analysis_id,
            old_pr_number,
            feedback_text,
            iteration_number
        )
    )


async def _regenerate_fix_async(
    analysis_id: str,
    old_pr_number: int,
    feedback_text: str,
    iteration_number: int
):
    """Async implementation of fix regeneration with RL guidance"""
    try:
        from app.core.database import MongoDB
        from app.services.rl_service import RLService
        from app.services.fix_pattern_service import FixPatternService
        from app.services.fix_service import FixService
        from app.services.github_service import GitHubService
        import uuid
        from datetime import datetime
        from pathlib import Path

        # Ensure database is connected
        await connect_databases()

        db = MongoDB.get_database()

        # 1. Get original analysis
        original_analysis = await db.analyses.find_one({'id': analysis_id})
        if not original_analysis:
            logger.error(f"Analysis {analysis_id} not found")
            return {'success': False, 'reason': 'analysis_not_found'}

        repo_full_name = original_analysis['repo_full_name']
        commit_sha = original_analysis['commit_sha']

        # 2. Get RL guidance
        rl_service = RLService()
        rl_guidance = await rl_service.get_fix_guidance(
            analysis=original_analysis,
            user_feedback=feedback_text
        )

        logger.info(f"RL guidance received: {rl_guidance}")

        # 3. Get similar successful patterns from RAG
        vulnerabilities = original_analysis.get('vulnerabilities', [])
        rag_patterns = []

        for vuln in vulnerabilities:
            file_path = vuln.get('file_path', '')
            file_extension = Path(file_path).suffix or 'unknown'

            patterns = await FixPatternService.get_similar_patterns(
                vulnerability_type=vuln.get('type', 'UNKNOWN'),
                file_extension=file_extension,
                severity=vuln.get('severity'),
                limit=3
            )
            rag_patterns.extend(patterns)

        logger.info(f"Retrieved {len(rag_patterns)} similar successful patterns from RAG")

        # 4. Create new analysis record for this iteration
        new_analysis_id = f"analysis_{uuid.uuid4().hex[:12]}"
        new_analysis = {
            'id': new_analysis_id,
            'repo_full_name': repo_full_name,
            'commit_sha': commit_sha,
            'status': 'in_progress',
            'parent_analysis_id': analysis_id,
            'iteration_number': iteration_number,
            'previous_pr_numbers': original_analysis.get('previous_pr_numbers', []) + [old_pr_number],
            'rl_guidance_applied': True,
            'created_at': datetime.utcnow(),
            'vulnerabilities': vulnerabilities,
            'dependency_risks': original_analysis.get('dependency_risks', [])
        }

        await db.analyses.insert_one(new_analysis)
        logger.info(f"Created new analysis {new_analysis_id} for iteration {iteration_number}")

        # 5. Re-run fix generation with RL guidance and RAG patterns
        fix_service = FixService()

        # Get code files from original analysis
        code_files = original_analysis.get('code_files', [])
        if not code_files:
            logger.warning("No code files found in original analysis")

        # Generate fixes with RL guidance
        fixes = await fix_service.generate_fixes_with_rl_guidance(
            vulnerabilities=vulnerabilities,
            code_files=code_files,
            repo_path=None,  # We don't need repo path for regeneration
            feedback_context={
                'feedback_text': feedback_text,
                'iteration_number': iteration_number,
                'previous_pr_number': old_pr_number
            },
            rl_guidance=rl_guidance,
            rag_patterns=rag_patterns
        )

        logger.info(f"Generated {len(fixes)} refined fixes with RL guidance")

        # 6. Create new PR with refined fixes
        github_service = GitHubService()

        # Build analysis summary with iteration info
        analysis_summary = f"""## 🔄 Refined Security Fixes (Iteration {iteration_number})

### 📝 User Feedback from Iteration {iteration_number - 1}
> {feedback_text}

### 🤖 Improvements Applied
- **RL Guidance**: Applied machine learning insights from previous feedback
- **Similar Patterns**: Referenced {len(rag_patterns)} successful fix patterns
- **Iteration**: {iteration_number}/{PRWorkflowService.MAX_ITERATIONS}

### 🔍 Original Findings
{len(vulnerabilities)} vulnerabilities detected:
"""
        for vuln in vulnerabilities:
            analysis_summary += f"- **{vuln.get('type')}** ({vuln.get('severity')}) in `{vuln.get('file_path')}`\n"

        # Create PR
        pr_result = await github_service.create_fix_pr(
            repo_full_name=repo_full_name,
            base_commit=commit_sha,
            fixes=fixes,
            analysis_summary=analysis_summary,
            source_pr_number=None
        )

        new_pr_number = pr_result['pr_number']
        new_pr_url = pr_result['pr_url']

        logger.info(f"Created new PR #{new_pr_number}: {new_pr_url}")

        # 7. Update new analysis with PR info
        await db.analyses.update_one(
            {'id': new_analysis_id},
            {
                '$set': {
                    'status': 'completed',
                    'pr_number': new_pr_number,
                    'pr_url': new_pr_url,
                    'fixes': fixes,
                    'completed_at': datetime.utcnow()
                }
            }
        )

        # 8. Add comment to old PR with link to new one (PR was already closed in handle_deny)
        try:
            await github_service.add_pr_comment(
                repo_full_name=repo_full_name,
                pr_number=old_pr_number,
                comment=f"🔄 **New improved fix PR created!**\n\n"
                        f"Based on your feedback, a refined fix has been generated:\n"
                        f"→ **New PR**: #{new_pr_number}\n\n"
                        f"**Improvements**:\n"
                        f"- Applied reinforcement learning guidance\n"
                        f"- Incorporated {len(rag_patterns)} similar successful patterns\n"
                        f"- Iteration {iteration_number}/{PRWorkflowService.MAX_ITERATIONS}\n\n"
                        f"Please review the new PR: {new_pr_url}"
            )
        except Exception as e:
            logger.warning(f"Could not add comment to old PR #{old_pr_number}: {e}")

        logger.info(f"Created new PR #{new_pr_number} to replace old PR #{old_pr_number}")

        return {
            'success': True,
            'new_analysis_id': new_analysis_id,
            'new_pr_number': new_pr_number,
            'new_pr_url': new_pr_url,
            'iteration_number': iteration_number,
            'fixes_generated': len(fixes),
            'rag_patterns_used': len(rag_patterns)
        }

    except Exception as e:
        logger.error(f"Error regenerating fix: {e}", exc_info=True)
        return {
            'success': False,
            'reason': 'internal_error',
            'message': str(e)
        }
    finally:
        await disconnect_databases()
