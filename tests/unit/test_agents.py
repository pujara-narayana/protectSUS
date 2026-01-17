"""Unit tests for security analysis agents"""

import pytest
from app.services.agents.vulnerability_agent import VulnerabilityAgent
from app.services.agents.dependency_agent import DependencyAgent


class TestVulnerabilityAgent:
    """Test Vulnerability Assessment Agent"""

    @pytest.fixture
    def agent(self):
        return VulnerabilityAgent()

    def test_agent_initialization(self, agent):
        """Test agent is properly initialized"""
        assert agent.name == "VulnerabilityAgent"
        assert agent.client is not None
        assert agent.model == "claude-3-5-sonnet-20241022"

    @pytest.mark.asyncio
    async def test_extract_findings(self, agent):
        """Test finding extraction from response"""
        response = """
        FILE: test.py
        LINE: 10
        SEVERITY: high
        TYPE: SQL_INJECTION
        DESCRIPTION: SQL injection vulnerability
        CWE: CWE-89
        FIX: Use parameterized queries
        """

        findings = agent._extract_findings(response, 'vulnerability')

        assert len(findings) > 0
        assert findings[0]['file_path'] == 'test.py'
        assert findings[0]['line_number'] == 10
        assert findings[0]['severity'] == 'high'
        assert findings[0]['type'] == 'SQL_INJECTION'


class TestDependencyAgent:
    """Test Dependency Risk Agent"""

    @pytest.fixture
    def agent(self):
        return DependencyAgent()

    def test_agent_initialization(self, agent):
        """Test agent is properly initialized"""
        assert agent.name == "DependencyAgent"
        assert agent.client is not None

    def test_extract_dependencies(self, agent):
        """Test dependency file extraction"""
        code = """
        // FILE: requirements.txt
        flask==2.0.0
        requests==2.25.0

        // FILE: app.py
        import flask
        """

        deps = agent._extract_dependencies(code)

        assert 'requirements.txt' in deps
        assert 'flask==2.0.0' in deps
