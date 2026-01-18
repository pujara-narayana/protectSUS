"""GitHub integration service for code retrieval and PR management"""

from github import Github, Auth, GithubIntegration
from github.GithubException import GithubException
import git
import tempfile
import shutil
from pathlib import Path
from typing import Optional, Dict, Any, List
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class GitHubService:
    """Service for GitHub operations"""

    def __init__(self):
        """Initialize GitHub client"""
        # Read private key from file
        with open(settings.GITHUB_APP_PRIVATE_KEY_PATH, 'r') as key_file:
            self.private_key = key_file.read()

        self.app_id = settings.GITHUB_APP_ID
        
        # Authenticate as GitHub App
        auth = Auth.AppAuth(self.app_id, self.private_key)
        self.github = Github(auth=auth)

    def get_installation_client(self, repo_full_name: str) -> Github:
        """Get GitHub client for a specific installation"""
        owner = repo_full_name.split("/")[0]

        integration = GithubIntegration(
            self.app_id,
            self.private_key,
        )

        for installation in integration.get_installations():
            # Access account info from raw_data
            account = installation.raw_data.get("account", {})
            account_login = account.get("login", "")
            if account_login.lower() == owner.lower():
                return integration.get_github_for_installation(installation.id)

        raise Exception(f"No installation found for repo owner {owner}")

    async def clone_repository(
        self,
        repo_full_name: str,
        commit_sha: str,
        clone_url: str
    ) -> str:
        """
        Clone repository at specific commit

        Returns path to cloned repository
        """
        try:
            # Create temporary directory
            temp_dir = tempfile.mkdtemp(prefix="protectsus_")
            logger.info(f"Cloning {repo_full_name} at {commit_sha} to {temp_dir}")

            # Clone repository
            repo = git.Repo.clone_from(clone_url, temp_dir)

            # Checkout specific commit
            repo.git.checkout(commit_sha)

            logger.info(f"Successfully cloned repository to {temp_dir}")
            return temp_dir

        except Exception as e:
            logger.error(f"Error cloning repository: {e}")
            if temp_dir and Path(temp_dir).exists():
                shutil.rmtree(temp_dir)
            raise

    async def get_code_files(self, repo_path: str) -> List[Dict[str, Any]]:
        """
        Get all code files from repository

        Returns list of files with path and content
        """
        code_files = []
        code_extensions = {
            '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.go', '.rs',
            '.c', '.cpp', '.h', '.hpp', '.cs', '.rb', '.php', '.swift',
            '.kt', '.scala', '.sh', '.sql', '.yaml', '.yml', '.json'
        }

        try:
            repo_path_obj = Path(repo_path)

            for file_path in repo_path_obj.rglob('*'):
                # Skip directories, hidden files, and non-code files
                if file_path.is_dir():
                    continue
                if any(part.startswith('.') for part in file_path.parts):
                    continue
                if file_path.suffix not in code_extensions:
                    continue

                # Skip common non-source directories
                skip_dirs = {'node_modules', 'venv', 'env', '__pycache__', 'build', 'dist', '.git'}
                if any(skip_dir in file_path.parts for skip_dir in skip_dirs):
                    continue

                try:
                    # Read file content
                    content = file_path.read_text(encoding='utf-8')
                    relative_path = file_path.relative_to(repo_path_obj)

                    code_files.append({
                        'path': str(relative_path),
                        'content': content,
                        'size': len(content),
                        'extension': file_path.suffix
                    })
                except (UnicodeDecodeError, PermissionError) as e:
                    logger.warning(f"Skipping file {file_path}: {e}")
                    continue

            logger.info(f"Found {len(code_files)} code files")
            return code_files

        except Exception as e:
            logger.error(f"Error reading code files: {e}")
            raise

    async def create_fix_pr(
        self,
        repo_full_name: str,
        base_commit: str,
        fixes: List[Dict[str, Any]],
        analysis_summary: str
    ) -> Dict[str, Any]:
        """
        Create a pull request with automated fixes

        Args:
            repo_full_name: Full repository name (owner/repo)
            base_commit: Base commit SHA
            fixes: List of fixes to apply
            analysis_summary: Summary of security analysis

        Returns:
            Dictionary with PR number and URL
        """
        try:
            gh = self.get_installation_client(repo_full_name)
            repo = gh.get_repo(repo_full_name)

            # Create new branch
            branch_name = f"protectsus-fixes-{base_commit[:7]}"
            base_ref = repo.get_git_ref(f"heads/{repo.default_branch}")
            repo.create_git_ref(f"refs/heads/{branch_name}", base_commit)

            logger.info(f"Created branch {branch_name}")

            # Apply fixes
            for fix in fixes:
                file_path = fix['file_path']
                new_content = fix['fixed_content']

                try:
                    # Get current file
                    contents = repo.get_contents(file_path, ref=branch_name)

                    # Update file
                    repo.update_file(
                        path=file_path,
                        message=f"Fix: {fix.get('description', 'Security fix')}",
                        content=new_content,
                        sha=contents.sha,
                        branch=branch_name
                    )
                    logger.info(f"Updated file: {file_path}")

                except GithubException as e:
                    logger.warning(f"Could not update {file_path}: {e}")
                    continue

            # Create PR
            pr_title = "🔒 ProtectSUS: Automated Security Fixes"
            pr_body = f"""## Security Analysis Report

{analysis_summary}

### Fixes Applied

"""
            for i, fix in enumerate(fixes, 1):
                pr_body += f"{i}. **{fix['file_path']}**: {fix.get('description', 'Security fix')}\n"

            pr_body += """

---

🤖 This PR was automatically generated by [ProtectSUS](https://github.com/your-org/protectsus)

**Please review carefully before merging!**

### Feedback
- ✅ Approve this PR if the fixes are correct
- ❌ Close with comments if the fixes need adjustment
"""

            pr = repo.create_pull(
                title=pr_title,
                body=pr_body,
                head=branch_name,
                base=repo.default_branch
            )

            logger.info(f"Created PR #{pr.number}")

            return {
                'pr_number': pr.number,
                'pr_url': pr.html_url,
                'branch': branch_name
            }

        except Exception as e:
            logger.error(f"Error creating fix PR: {e}")
            raise

    async def add_pr_comment(
        self,
        repo_full_name: str,
        pr_number: int,
        comment: str
    ):
        """Add a comment to a pull request"""
        try:
            gh = self.get_installation_client(repo_full_name)
            repo = gh.get_repo(repo_full_name)
            pr = repo.get_pull(pr_number)
            pr.create_issue_comment(comment)
            logger.info(f"Added comment to PR #{pr_number}")
        except Exception as e:
            logger.error(f"Error adding PR comment: {e}")
            raise

    def cleanup_repo(self, repo_path: str):
        """Clean up cloned repository"""
        try:
            if Path(repo_path).exists():
                shutil.rmtree(repo_path)
                logger.info(f"Cleaned up repository at {repo_path}")
        except Exception as e:
            logger.warning(f"Error cleaning up repository: {e}")
