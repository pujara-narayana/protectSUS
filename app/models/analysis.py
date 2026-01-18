"""Analysis data models"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class AnalysisStatus(str, Enum):
    """Analysis status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class Vulnerability(BaseModel):
    """Vulnerability finding model"""
    type: str = Field(..., description="Type of vulnerability (e.g., SQL_INJECTION, XSS)")
    severity: str = Field(..., description="Severity level (critical, high, medium, low)")
    file_path: str = Field(..., description="Path to the affected file")
    line_number: int = Field(..., description="Line number where vulnerability was found")
    description: str = Field(..., description="Detailed description of the vulnerability")
    cwe_id: Optional[str] = Field(None, description="CWE identifier if applicable")
    recommended_fix: Optional[str] = Field(None, description="Recommended fix description")


class DependencyRisk(BaseModel):
    """Dependency risk assessment model"""
    package_name: str = Field(..., description="Name of the package")
    version: str = Field(..., description="Version of the package")
    risk_level: str = Field(..., description="Risk level (critical, high, medium, low)")
    vulnerabilities: List[str] = Field(default_factory=list, description="List of known vulnerabilities")
    outdated: bool = Field(False, description="Whether the package is outdated")
    latest_version: Optional[str] = Field(None, description="Latest available version")


class AgentAnalysis(BaseModel):
    """Individual agent analysis result"""
    agent_name: str = Field(..., description="Name of the agent")
    findings: List[Dict[str, Any]] = Field(default_factory=list, description="Agent findings")
    execution_time: float = Field(..., description="Execution time in seconds")
    tokens_used: int = Field(0, description="Number of tokens used")


class Analysis(BaseModel):
    """Complete analysis model"""
    id: str = Field(..., description="Unique analysis identifier")
    repo_full_name: str = Field(..., description="Full repository name (owner/repo)")
    commit_sha: str = Field(..., description="Commit SHA that triggered the analysis")
    status: AnalysisStatus = Field(default=AnalysisStatus.PENDING, description="Current status")

    # Analysis results
    vulnerabilities: List[Vulnerability] = Field(default_factory=list)
    dependency_risks: List[DependencyRisk] = Field(default_factory=list)
    agent_analyses: List[AgentAnalysis] = Field(default_factory=list)

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    total_execution_time: Optional[float] = None
    total_tokens_used: int = 0

    # Fix generation
    pr_number: Optional[int] = Field(None, description="Pull request number if fix was created")
    pr_url: Optional[str] = Field(None, description="Pull request URL")

    # Debate and summary
    debate_transcript: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Full transcript of agent debate/discussion"
    )
    summary: Optional[str] = Field(None, description="Final analysis summary")

    # Feedback
    user_approved: Optional[bool] = None
    user_feedback: Optional[str] = None

    # Iteration tracking for PR approval/denial workflow
    parent_analysis_id: Optional[str] = Field(
        None,
        description="ID of parent analysis if this is a refinement iteration"
    )
    iteration_number: int = Field(
        default=1,
        description="Iteration number (1, 2, 3). 1 = initial, 2+ = refinements"
    )
    previous_pr_numbers: List[int] = Field(
        default_factory=list,
        description="PR numbers from previous iterations"
    )
    denial_reasons: List[str] = Field(
        default_factory=list,
        description="User feedback from PR denials"
    )
    rl_guidance_applied: bool = Field(
        default=False,
        description="Whether RL guidance was used in fix generation"
    )
    feedback_features: Optional[Dict[str, Any]] = Field(
        None,
        description="Extracted features from user feedback (LLM-based)"
    )

    # Additional PR workflow fields
    approved_by: Optional[str] = Field(None, description="GitHub username who approved")
    denied_by: Optional[str] = Field(None, description="GitHub username who denied")
    approved_at: Optional[datetime] = Field(None, description="Timestamp of approval")
    denied_at: Optional[datetime] = Field(None, description="Timestamp of denial")
    merged: Optional[bool] = Field(None, description="Whether PR was merged")
    merge_sha: Optional[str] = Field(None, description="SHA of merge commit")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "analysis_123",
                "repo_full_name": "owner/repo",
                "commit_sha": "abc123",
                "status": "completed",
                "vulnerabilities": [],
                "dependency_risks": [],
                "created_at": "2024-01-17T00:00:00Z"
            }
        }
