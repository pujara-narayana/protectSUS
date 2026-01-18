"""Dependency Risk Agent (DRA)"""

from typing import Dict, Any, List
import re
import logging

from app.services.agents.base_agent import BaseAgent
from app.models.analysis import DependencyRisk

logger = logging.getLogger(__name__)


class DependencyAgent(BaseAgent):
    """Agent for assessing dependency security risks"""

    def __init__(self, llm_provider: str = None, custom_api_key: str = None):
        super().__init__("DependencyAgent", llm_provider=llm_provider)

    async def analyze(self, code: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze dependencies for security risks

        Checks for: outdated packages, known vulnerabilities,
        supply chain risks, licensing issues
        """
        logger.info(f"{self.name}: Starting dependency analysis")

        # Extract dependency files from code
        dependencies = self._extract_dependencies(code)

        if not dependencies:
            logger.info(f"{self.name}: No dependency files found")
            return {
                'agent_name': self.name,
                'dependency_risks': [],
                'findings_count': 0
            }

        system_prompt = """You are an expert in software supply chain security, dependency management, and build systems.

Your task is to analyze the provided dependency files for security risks AND potential build/runtime issues.

**DEPENDENCY SECURITY RISKS:**
1. Known vulnerabilities (CVEs) in dependencies
2. Outdated packages with available security updates
3. Deprecated or unmaintained packages
4. Supply chain risks (typosquatting, malicious packages)
5. License compliance issues
6. Transitive dependency risks

**BUILD & COMPATIBILITY ISSUES:**
7. Version conflicts between dependencies
8. Missing required dependencies
9. Incompatible package versions (breaking changes)
10. Platform-specific dependencies that may fail
11. Dependency resolution conflicts
12. Deprecated package versions that may cause build failures
13. Peer dependency mismatches

**PRIORITY:** Flag CRITICAL issues that will prevent build or cause immediate runtime failures.

For each risky dependency found, provide output in this format:

PACKAGE: [package name]
VERSION: [current version]
LATEST: [latest version]
RISK_LEVEL: [critical|high|medium|low]
VULNERABILITIES: [comma-separated CVE IDs or vulnerability descriptions]
OUTDATED: [yes|no]
BUILD_IMPACT: [will this cause build failures or runtime errors?]
RECOMMENDATION: [what action to take with specific version if applicable]

Be specific and actionable. Prioritize issues that will break the build or cause runtime failures."""

        user_prompt = f"""Analyze these dependency files for security risks AND build/compatibility issues:

{dependencies}

**IMPORTANT:**
1. Check for version conflicts and incompatibilities first
2. Identify deprecated packages that may break builds
3. Look for missing peer dependencies
4. Then assess security vulnerabilities

Provide detailed risk assessment following the specified format, prioritizing issues that will break builds or cause runtime failures."""

        try:
            # Call LLM API
            response = await self._call_llm(system_prompt, user_prompt)

            # Extract structured findings
            dependency_risks = self._parse_dependency_risks(response)

            logger.info(f"{self.name}: Found {len(dependency_risks)} dependency risks")

            return {
                'agent_name': self.name,
                'dependency_risks': [d.model_dump() for d in dependency_risks],
                'raw_response': response,
                'findings_count': len(dependency_risks)
            }

        except Exception as e:
            logger.error(f"{self.name}: Analysis failed: {e}")
            raise

    def _extract_dependencies(self, code: str) -> str:
        """Extract dependency files from code"""
        dependency_files = []
        current_file = None
        current_content = []

        for line in code.split('\n'):
            if line.startswith('// FILE:'):
                # Save previous file
                if current_file and current_content:
                    dependency_files.append(f"// {current_file}\n" + "\n".join(current_content))

                # Check if this is a dependency file
                file_path = line.replace('// FILE:', '').strip()
                if any(dep_file in file_path.lower() for dep_file in [
                    'requirements.txt', 'package.json', 'package-lock.json',
                    'pom.xml', 'build.gradle', 'cargo.toml', 'go.mod',
                    'gemfile', 'composer.json', 'pipfile'
                ]):
                    current_file = file_path
                    current_content = []
                else:
                    current_file = None
                    current_content = []
            elif current_file:
                current_content.append(line)

        # Save last file
        if current_file and current_content:
            dependency_files.append(f"// {current_file}\n" + "\n".join(current_content))

        return "\n\n".join(dependency_files) if dependency_files else ""

    def _parse_dependency_risks(self, response: str) -> List[DependencyRisk]:
        """Parse dependency risks from Claude response"""
        risks = []
        current_risk = {}

        for line in response.split('\n'):
            line = line.strip()

            if line.startswith('PACKAGE:'):
                if current_risk and 'package_name' in current_risk:
                    risks.append(self._create_dependency_risk(current_risk))
                current_risk = {'package_name': line.replace('PACKAGE:', '').strip()}

            elif line.startswith('VERSION:'):
                current_risk['version'] = line.replace('VERSION:', '').strip()

            elif line.startswith('LATEST:'):
                current_risk['latest_version'] = line.replace('LATEST:', '').strip()

            elif line.startswith('RISK_LEVEL:'):
                current_risk['risk_level'] = line.replace('RISK_LEVEL:', '').strip().lower()

            elif line.startswith('VULNERABILITIES:'):
                vulns = line.replace('VULNERABILITIES:', '').strip()
                current_risk['vulnerabilities'] = [v.strip() for v in vulns.split(',') if v.strip()]

            elif line.startswith('OUTDATED:'):
                current_risk['outdated'] = line.replace('OUTDATED:', '').strip().lower() == 'yes'

        # Add last risk
        if current_risk and 'package_name' in current_risk:
            risks.append(self._create_dependency_risk(current_risk))

        return risks

    def _create_dependency_risk(self, data: Dict[str, Any]) -> DependencyRisk:
        """Create DependencyRisk model from parsed data"""
        return DependencyRisk(
            package_name=data.get('package_name', 'unknown'),
            version=data.get('version', 'unknown'),
            risk_level=data.get('risk_level', 'low'),
            vulnerabilities=data.get('vulnerabilities', []),
            outdated=data.get('outdated', False),
            latest_version=data.get('latest_version')
        )
