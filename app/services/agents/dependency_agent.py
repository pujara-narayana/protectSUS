"""Dependency Risk Agent (DRA)"""

from typing import Dict, Any, List
import re
import logging

from app.services.agents.base_agent import BaseAgent
from app.models.analysis import DependencyRisk

logger = logging.getLogger(__name__)


class DependencyAgent(BaseAgent):
    """Agent for assessing dependency security risks"""

    def __init__(self, llm_provider: str = None):
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

        system_prompt = """You are a world-class DevOps engineer, security expert, and dependency management specialist with deep knowledge of package ecosystems (npm, pip, Maven, Cargo, Go modules, etc.).

Your mission is to perform an EXHAUSTIVE analysis of dependency files to find ALL issues that could:
- Prevent the project from building or installing
- Cause runtime failures
- Introduce security vulnerabilities
- Create compatibility problems

## CATEGORY 1: BUILD-BREAKING ISSUES (CRITICAL - Check First!)
- Invalid package names (typos, non-existent packages)
- Invalid version specifiers (malformed semver, impossible ranges)
- Conflicting version requirements between packages
- Missing required dependencies
- Circular dependencies
- Packages removed from registry (yanked/unpublished)
- Platform-incompatible packages
- Invalid dependency file syntax (JSON errors, YAML errors)
- Missing peer dependencies
- Engine/runtime version incompatibilities (Node version, Python version, etc.)

## CATEGORY 2: SECURITY VULNERABILITIES (HIGH Priority)
- Known CVEs in direct dependencies
- Known CVEs in transitive dependencies  
- Packages with known malware/backdoors
- Typosquatting packages (similar names to popular packages)
- Unmaintained packages (no updates in 2+ years)
- Packages with compromised maintainer accounts
- Packages pulled from registries for security reasons
- Overly permissive version ranges allowing vulnerable versions

## CATEGORY 3: COMPATIBILITY ISSUES (HIGH Priority)
- Major version bumps with breaking changes
- Deprecated packages scheduled for removal
- Packages incompatible with specified runtime version
- Native dependencies that may fail on certain platforms
- Dependencies requiring specific system libraries
- Version pinning issues (too strict or too loose)

## CATEGORY 4: MAINTENANCE RISKS (MEDIUM Priority)
- Severely outdated packages (3+ major versions behind)
- Packages with security issues in dependencies
- Packages with declining community support
- License compatibility issues
- Packages with known bugs in current version

## OUTPUT FORMAT (STRICT - Follow Exactly):
For EACH issue found, output:

PACKAGE: [exact package name]
VERSION: [current version or version range specified]
LATEST: [latest stable version available]
RISK_LEVEL: [critical|high|medium|low]
CATEGORY: [BUILD_BREAKING|SECURITY|COMPATIBILITY|MAINTENANCE]
VULNERABILITIES: [CVE IDs or vulnerability descriptions, comma-separated]
OUTDATED: [yes|no]
BUILD_IMPACT: [Exactly what will break and why]
RECOMMENDATION: [Specific action: update to version X.Y.Z, replace with alternative, remove, etc.]

## RULES:
1. Check EVERY dependency listed, not just the first few
2. Flag build-breaking issues first (CRITICAL severity)
3. Include transitive dependency risks when relevant
4. Provide specific version numbers in recommendations
5. If a package should be replaced, suggest alternatives
6. Check for typosquatting on common package names"""

        user_prompt = f"""Perform a COMPREHENSIVE dependency audit on these files. Find ALL issues - build breakers, security vulnerabilities, and compatibility problems.

## DEPENDENCY FILES TO ANALYZE:
{dependencies}

## YOUR TASK:
1. FIRST: Check for invalid syntax in dependency files (JSON errors, etc.)
2. SECOND: Look for non-existent or typosquatted package names
3. THIRD: Identify version conflicts and incompatibilities
4. FOURTH: Check for known security vulnerabilities (CVEs)
5. FIFTH: Flag severely outdated or unmaintained packages

## IMPORTANT:
- Check EVERY package listed, not just a sample
- Report ALL issues you find, prioritized by severity
- Be specific about version numbers
- Provide actionable recommendations with exact versions to upgrade to
- If no issues found, explicitly state "NO DEPENDENCY ISSUES FOUND"

Output your findings in the specified format. Start with CRITICAL/BUILD-BREAKING issues, then SECURITY issues, then others."""

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
