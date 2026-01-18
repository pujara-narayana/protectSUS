"""PR workflow service for handling approval/denial of fix PRs"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

from app.core.database import MongoDB
from app.services.github_service import GitHubService
from app.services.fix_pattern_service import FixPatternService
from app.services.feedback_service import FeedbackService

logger = logging.getLogger(__name__)


class PRWorkflowService:
    """Service for handling PR approval/denial workflow"""

    MAX_ITERATIONS = 3

    @staticmethod
    async def check_authorization(
        repo_full_name: str,
        username: str
    ) -> bool:
        """
        Check if user is authorized to approve/deny PRs

        Args:
            repo_full_name: Full repository name (owner/repo)
            username: GitHub username

        Returns:
            True if authorized, False otherwise
        """
        github_service = GitHubService()
        return await github_service.check_user_authorization(repo_full_name, username)

    @staticmethod
    async def get_analysis_by_pr(
        repo_full_name: str,
        pr_number: int
    ) -> Optional[Dict[str, Any]]:
        """
        Get analysis associated with a PR

        Args:
            repo_full_name: Full repository name
            pr_number: PR number

        Returns:
            Analysis document or None if not found
        """
        try:
            db = MongoDB.get_database()

            analysis = await db.analyses.find_one({
                'repo_full_name': repo_full_name,
                'pr_number': pr_number
            })

            return analysis

        except Exception as e:
            logger.error(f"Error getting analysis for PR #{pr_number}: {e}")
            return None

    @staticmethod
    async def handle_approve(
        repo_full_name: str,
        pr_number: int,
        commenter: str
    ) -> Dict[str, Any]:
        """
        Handle PR approval workflow

        Args:
            repo_full_name: Full repository name (owner/repo)
            pr_number: PR number
            commenter: GitHub username of commenter

        Returns:
            Dictionary with approval status and details
        """
        try:
            github_service = GitHubService()

            # 1. Check authorization
            is_authorized = await PRWorkflowService.check_authorization(
                repo_full_name, commenter
            )

            if not is_authorized:
                # Add comment explaining authorization required
                await github_service.add_pr_comment(
                    repo_full_name=repo_full_name,
                    pr_number=pr_number,
                    comment="❌ Only repository collaborators can approve/deny protectSUS fixes."
                )
                return {
                    'success': False,
                    'reason': 'unauthorized',
                    'message': f"User {commenter} is not authorized"
                }

            # 2. Get analysis from database
            analysis = await PRWorkflowService.get_analysis_by_pr(
                repo_full_name, pr_number
            )

            if not analysis:
                await github_service.add_pr_comment(
                    repo_full_name=repo_full_name,
                    pr_number=pr_number,
                    comment="❌ Could not find analysis data for this PR."
                )
                return {
                    'success': False,
                    'reason': 'analysis_not_found',
                    'message': 'No analysis found for this PR'
                }

            analysis_id = analysis['id']

            # 3. Get PR details and check mergeability
            pr_details = await github_service.get_pull_request(
                repo_full_name, pr_number
            )

            if pr_details['merged']:
                await github_service.add_pr_comment(
                    repo_full_name=repo_full_name,
                    pr_number=pr_number,
                    comment="✅ This PR has already been merged."
                )
                return {
                    'success': True,
                    'reason': 'already_merged',
                    'message': 'PR already merged'
                }

            if pr_details['state'] == 'closed':
                await github_service.add_pr_comment(
                    repo_full_name=repo_full_name,
                    pr_number=pr_number,
                    comment="❌ This PR is already closed."
                )
                return {
                    'success': False,
                    'reason': 'already_closed',
                    'message': 'PR already closed'
                }

            # 4. Check if PR is mergeable
            mergeable_status = await github_service.check_pr_mergeable(
                repo_full_name, pr_number
            )

            if mergeable_status['has_conflicts']:
                await github_service.add_pr_comment(
                    repo_full_name=repo_full_name,
                    pr_number=pr_number,
                    comment="❌ **Cannot auto-merge: This PR has merge conflicts**\n\n"
                            "Please resolve the conflicts manually before approving."
                )
                return {
                    'success': False,
                    'reason': 'has_conflicts',
                    'message': 'PR has merge conflicts'
                }

            # 5. Merge the PR
            try:
                merge_result = await github_service.merge_pull_request(
                    repo_full_name=repo_full_name,
                    pr_number=pr_number,
                    merge_method="squash",
                    commit_title=f"🔒 Security fixes from protectSUS (#{pr_number})",
                    commit_message=f"Approved by @{commenter}\n\nAnalysis ID: {analysis_id}"
                )

                logger.info(f"Successfully merged PR #{pr_number}: {merge_result}")

            except Exception as e:
                logger.error(f"Error merging PR #{pr_number}: {e}")
                await github_service.add_pr_comment(
                    repo_full_name=repo_full_name,
                    pr_number=pr_number,
                    comment=f"❌ **Failed to merge PR**\n\nError: {str(e)}\n\n"
                            "Please merge manually or contact the repository administrator."
                )
                return {
                    'success': False,
                    'reason': 'merge_failed',
                    'message': str(e)
                }

            # 6. Update analysis in MongoDB
            db = MongoDB.get_database()
            await db.analyses.update_one(
                {'id': analysis_id},
                {
                    '$set': {
                        'user_approved': True,
                        'approved_by': commenter,
                        'approved_at': datetime.utcnow(),
                        'merged': True,
                        'merge_sha': merge_result['sha']
                    }
                }
            )

            # 7. Extract and store fix patterns for RAG
            vulnerabilities = analysis.get('vulnerabilities', [])
            fixes = analysis.get('fixes', [])

            pattern_ids = []
            for i, vuln in enumerate(vulnerabilities):
                if i < len(fixes):
                    fix = fixes[i]
                    try:
                        pattern_id = await FixPatternService.store_successful_pattern(
                            analysis_id=analysis_id,
                            vulnerability_type=vuln.get('type', 'UNKNOWN'),
                            severity=vuln.get('severity', 'medium'),
                            file_path=vuln.get('file_path', ''),
                            code_before=fix.get('original_content', ''),
                            code_after=fix.get('fixed_content', ''),
                            fix_description=fix.get('description', ''),
                            repo_full_name=repo_full_name
                        )
                        pattern_ids.append(pattern_id)
                    except Exception as e:
                        logger.error(f"Error storing fix pattern: {e}")

            logger.info(f"Stored {len(pattern_ids)} fix patterns for analysis {analysis_id}")

            # 8. Submit feedback to RL system
            try:
                await FeedbackService.submit_feedback(
                    analysis_id=analysis_id,
                    approved=True,
                    feedback_text=f"PR approved and merged by @{commenter}"
                )
            except Exception as e:
                logger.error(f"Error submitting feedback: {e}")

            # 9. Add success comment to PR
            await github_service.add_pr_comment(
                repo_full_name=repo_full_name,
                pr_number=pr_number,
                comment=f"✅ **PR Approved and Merged!**\n\n"
                        f"Thank you @{commenter} for approving these security fixes.\n\n"
                        f"- **Analysis ID**: `{analysis_id}`\n"
                        f"- **Merge SHA**: `{merge_result['sha'][:7]}`\n"
                        f"- **Patterns Stored**: {len(pattern_ids)} fix patterns saved for future reference\n\n"
                        f"🤖 This fix has been added to the protectSUS knowledge base to improve future fixes."
            )

            return {
                'success': True,
                'reason': 'merged',
                'message': 'PR successfully merged',
                'merge_sha': merge_result['sha'],
                'pattern_ids': pattern_ids
            }

        except Exception as e:
            logger.error(f"Error in approval workflow: {e}", exc_info=True)
            return {
                'success': False,
                'reason': 'internal_error',
                'message': str(e)
            }

    @staticmethod
    async def handle_deny(
        repo_full_name: str,
        pr_number: int,
        feedback_text: str,
        commenter: str
    ) -> Dict[str, Any]:
        """
        Handle PR denial workflow

        Args:
            repo_full_name: Full repository name (owner/repo)
            pr_number: PR number
            feedback_text: User's feedback text
            commenter: GitHub username of commenter

        Returns:
            Dictionary with denial status and details
        """
        try:
            from app.services.command_parser import CommandParser

            github_service = GitHubService()

            # 1. Check authorization
            is_authorized = await PRWorkflowService.check_authorization(
                repo_full_name, commenter
            )

            if not is_authorized:
                # Add comment explaining authorization required
                await github_service.add_pr_comment(
                    repo_full_name=repo_full_name,
                    pr_number=pr_number,
                    comment="❌ Only repository collaborators can approve/deny protectSUS fixes."
                )
                return {
                    'success': False,
                    'reason': 'unauthorized',
                    'message': f"User {commenter} is not authorized"
                }

            # 2. Get analysis from database
            analysis = await PRWorkflowService.get_analysis_by_pr(
                repo_full_name, pr_number
            )

            if not analysis:
                await github_service.add_pr_comment(
                    repo_full_name=repo_full_name,
                    pr_number=pr_number,
                    comment="❌ Could not find analysis data for this PR."
                )
                return {
                    'success': False,
                    'reason': 'analysis_not_found',
                    'message': 'No analysis found for this PR'
                }

            analysis_id = analysis['id']

            # 3. Check iteration limit
            iteration_number = analysis.get('iteration_number', 1)
            if iteration_number >= PRWorkflowService.MAX_ITERATIONS:
                await github_service.add_pr_comment(
                    repo_full_name=repo_full_name,
                    pr_number=pr_number,
                    comment=f"❌ **Maximum iterations reached ({PRWorkflowService.MAX_ITERATIONS})**\n\n"
                            "This fix has been refined the maximum number of times. "
                            "Further improvements will require manual intervention.\n\n"
                            f"Feedback received: \"{feedback_text}\"\n\n"
                            "Please either:\n"
                            "- Close this PR and create a manual fix\n"
                            "- Provide specific guidance for manual code review"
                )
                return {
                    'success': False,
                    'reason': 'max_iterations',
                    'message': f'Maximum iterations ({PRWorkflowService.MAX_ITERATIONS}) reached'
                }

            # 4. Extract feedback features using LLM
            logger.info(f"Extracting feedback features from: {feedback_text[:100]}...")
            feedback_features = await CommandParser.extract_feedback_features(feedback_text)

            # 5. Update MongoDB with denial
            db = MongoDB.get_database()
            await db.analyses.update_one(
                {'id': analysis_id},
                {
                    '$set': {
                        'user_approved': False,
                        'denied_by': commenter,
                        'denied_at': datetime.utcnow(),
                        'user_feedback': feedback_text,
                        'feedback_features': feedback_features
                    },
                    '$push': {
                        'denial_reasons': feedback_text
                    }
                }
            )

            logger.info(f"Updated analysis {analysis_id} with denial feedback")

            # 6. Submit feedback to RL system
            try:
                await FeedbackService.submit_feedback(
                    analysis_id=analysis_id,
                    approved=False,
                    feedback_text=feedback_text
                )
            except Exception as e:
                logger.error(f"Error submitting feedback to RL: {e}")

            # 7. Queue background task for regeneration
            # This will be handled by the pr_workflow_tasks module
            # For now, add a comment indicating regeneration will happen
            await github_service.add_pr_comment(
                repo_full_name=repo_full_name,
                pr_number=pr_number,
                comment=f"✅ **Feedback received from @{commenter}**\n\n"
                        f"**Iteration**: {iteration_number} → {iteration_number + 1}\n\n"
                        f"**Your feedback**:\n> {feedback_text}\n\n"
                        f"**Feedback analysis**:\n"
                        f"- Issues identified: {len(feedback_features.get('identified_issues', []))}\n"
                        f"- Changes requested: {len(feedback_features.get('requested_changes', []))}\n"
                        f"- Sentiment: {feedback_features.get('sentiment', 'unknown')}\n"
                        f"- Specificity score: {feedback_features.get('specificity_score', 0):.2f}\n\n"
                        f"🤖 **protectSUS is now generating an improved fix based on your feedback...**\n\n"
                        f"A new PR will be created shortly. This PR will be closed once the new PR is ready."
            )

            # Return success with regeneration pending
            # The actual regeneration will be handled by a background task
            return {
                'success': True,
                'reason': 'feedback_received',
                'message': 'Feedback received, regeneration queued',
                'analysis_id': analysis_id,
                'iteration_number': iteration_number,
                'feedback_features': feedback_features,
                'regeneration_queued': True
            }

        except Exception as e:
            logger.error(f"Error in denial workflow: {e}", exc_info=True)
            return {
                'success': False,
                'reason': 'internal_error',
                'message': str(e)
            }
