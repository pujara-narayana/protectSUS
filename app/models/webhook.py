"""GitHub webhook payload models"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class Repository(BaseModel):
    """GitHub repository model"""
    id: int
    name: str
    full_name: str
    private: bool
    html_url: str
    clone_url: str
    default_branch: str = "main"


class Commit(BaseModel):
    """GitHub commit model"""
    id: str
    sha: str = Field(..., alias="id")
    message: str
    url: str
    author: Dict[str, Any]

    class Config:
        populate_by_name = True


class PushEvent(BaseModel):
    """GitHub push event webhook payload"""
    ref: str
    before: str
    after: str
    repository: Repository
    commits: list[Commit] = Field(default_factory=list)
    pusher: Dict[str, Any]
    sender: Dict[str, Any]

    def is_main_branch(self) -> bool:
        """Check if push is to main branch"""
        return self.ref in [f"refs/heads/{self.repository.default_branch}", "refs/heads/main", "refs/heads/master"]


class PullRequestEvent(BaseModel):
    """GitHub pull request event webhook payload"""
    action: str
    number: int
    pull_request: Dict[str, Any]
    repository: Repository
    sender: Dict[str, Any]

    def is_opened_or_synchronized(self) -> bool:
        """Check if PR was opened or updated"""
        return self.action in ["opened", "synchronize"]


class IssueCommentEvent(BaseModel):
    """GitHub issue comment event webhook payload"""
    action: str
    issue: Dict[str, Any]
    comment: Dict[str, Any]
    repository: Repository
    sender: Dict[str, Any]

    def is_pr_comment(self) -> bool:
        """Check if comment is on a pull request"""
        return "pull_request" in self.issue

    def is_protectsus_pr(self) -> bool:
        """Check if PR was created by protectSUS (branch name or title prefix)"""
        if not self.is_pr_comment():
            return False

        # Check branch name for protectSUS prefix
        pr_data = self.issue.get("pull_request", {})
        # Note: full PR data not available in issue comment webhook
        # We'll need to fetch it via API in the handler

        # Check PR title for protectSUS marker
        title = self.issue.get("title", "")
        return title.startswith("[protectSUS]") or "protectSUS" in title.lower()

    def get_comment_body(self) -> str:
        """Extract comment body text"""
        return self.comment.get("body", "").strip()

    def get_pr_number(self) -> Optional[int]:
        """Extract PR number if this is a PR comment"""
        if self.is_pr_comment():
            return self.issue.get("number")
        return None
