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
