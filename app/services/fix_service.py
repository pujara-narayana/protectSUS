"""Service for generating automated security fixes"""

from typing import List, Dict, Any
import logging

from app.core.config import settings
from app.core.llm_provider import LLMClient

logger = logging.getLogger(__name__)


class FixService:
    """Service for generating automated fixes for security vulnerabilities"""

    def __init__(self):
        self.llm_client = LLMClient()

    async def generate_fixes(
        self,
        vulnerabilities: List[Dict[str, Any]],
        code_files: List[Dict[str, Any]],
        repo_path: str
    ) -> List[Dict[str, Any]]:
        """
        Generate automated fixes for detected vulnerabilities

        Args:
            vulnerabilities: List of vulnerability findings
            code_files: Original code files
            repo_path: Path to cloned repository

        Returns:
            List of fixes with file_path, fixed_content, and description
        """
        logger.info(f"Generating fixes for {len(vulnerabilities)} vulnerabilities")

        fixes = []

        # Group vulnerabilities by file
        vulns_by_file = {}
        for vuln in vulnerabilities:
            file_path = vuln['file_path']
            if file_path not in vulns_by_file:
                vulns_by_file[file_path] = []
            vulns_by_file[file_path].append(vuln)

        # Generate fixes for each file
        for file_path, file_vulns in vulns_by_file.items():
            try:
                # Find original file content
                original_file = next(
                    (f for f in code_files if f['path'] == file_path),
                    None
                )

                if not original_file:
                    logger.warning(f"Could not find original file: {file_path}")
                    continue

                # Generate fix for this file
                fix = await self._generate_file_fix(
                    file_path=file_path,
                    original_content=original_file['content'],
                    vulnerabilities=file_vulns
                )

                if fix:
                    fixes.append(fix)

            except Exception as e:
                logger.error(f"Error generating fix for {file_path}: {e}")
                continue

        logger.info(f"Generated {len(fixes)} fixes")
        return fixes

    async def _generate_file_fix(
        self,
        file_path: str,
        original_content: str,
        vulnerabilities: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate fix for a single file"""

        # Prepare vulnerability descriptions
        vuln_descriptions = []
        for vuln in vulnerabilities:
            vuln_descriptions.append(
                f"- Line {vuln['line_number']}: {vuln['type']} ({vuln['severity']})\n"
                f"  {vuln['description']}\n"
                f"  Recommended fix: {vuln.get('recommended_fix', 'Apply secure coding practices')}"
            )

        system_prompt = """You are an expert security engineer specializing in secure code remediation.

Your task is to fix security vulnerabilities in code while:
1. Maintaining functionality
2. Following best practices
3. Adding security controls
4. Preserving code style
5. Adding comments explaining security fixes

Only output the COMPLETE fixed file content. Do not include explanations before or after the code."""

        user_prompt = f"""Fix the following security vulnerabilities in this file:

File: {file_path}

Vulnerabilities to fix:
{chr(10).join(vuln_descriptions)}

Original code:
```
{original_content}
```

Provide the complete fixed file content with all vulnerabilities addressed."""

        try:
            response = await self.llm_client.generate(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.0,
                max_tokens=8192
            )

            fixed_content = response['text']

            # Remove markdown code blocks if present
            if fixed_content.startswith('```'):
                lines = fixed_content.split('\n')
                # Remove first line (```) and last line (```)
                fixed_content = '\n'.join(lines[1:-1])

            # Create fix description
            description = f"Fixed {len(vulnerabilities)} security issue(s): " + ", ".join(
                v['type'] for v in vulnerabilities
            )

            return {
                'file_path': file_path,
                'fixed_content': fixed_content,
                'description': description,
                'vulnerabilities_fixed': [v['type'] for v in vulnerabilities]
            }

        except Exception as e:
            logger.error(f"Error calling LLM for fix generation: {e}")
            return None

    def generate_summary(
        self,
        vulnerabilities: List[Dict[str, Any]],
        dependency_risks: List[Dict[str, Any]]
    ) -> str:
        """Generate analysis summary for PR description"""

        summary = "### Security Analysis Summary\n\n"

        if vulnerabilities:
            # Count by severity
            severity_counts = {}
            for vuln in vulnerabilities:
                severity = vuln['severity']
                severity_counts[severity] = severity_counts.get(severity, 0) + 1

            summary += "**Vulnerabilities Found:**\n"
            for severity in ['critical', 'high', 'medium', 'low']:
                if severity in severity_counts:
                    emoji = '🔴' if severity == 'critical' else '🟠' if severity == 'high' else '🟡' if severity == 'medium' else '⚪'
                    summary += f"- {emoji} {severity_counts[severity]} {severity.upper()}\n"

            summary += "\n**Vulnerability Types:**\n"
            vuln_types = {}
            for vuln in vulnerabilities:
                vtype = vuln['type']
                vuln_types[vtype] = vuln_types.get(vtype, 0) + 1

            for vtype, count in vuln_types.items():
                summary += f"- {vtype}: {count}\n"

        if dependency_risks:
            summary += "\n**Dependency Risks:**\n"
            for risk in dependency_risks[:5]:  # Show top 5
                summary += f"- {risk['package_name']}@{risk['version']} ({risk['risk_level']})\n"

            if len(dependency_risks) > 5:
                summary += f"\n_...and {len(dependency_risks) - 5} more dependency issues_\n"

        return summary
