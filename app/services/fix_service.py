"""Service for generating automated security fixes"""

from typing import List, Dict, Any, Optional
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

    async def generate_fixes_with_rl_guidance(
        self,
        vulnerabilities: List[Dict[str, Any]],
        code_files: List[Dict[str, Any]],
        repo_path: Optional[str],
        feedback_context: Optional[Dict[str, Any]] = None,
        rl_guidance: Optional[Dict[str, Any]] = None,
        rag_patterns: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate fixes with RL guidance and RAG patterns

        Args:
            vulnerabilities: List of vulnerability findings
            code_files: Original code files
            repo_path: Path to cloned repository (can be None for regeneration)
            feedback_context: User feedback context
            rl_guidance: RL model guidance
            rag_patterns: Similar successful fix patterns from RAG

        Returns:
            List of fixes with file_path, fixed_content, and description
        """
        logger.info(
            f"Generating fixes with RL guidance for {len(vulnerabilities)} vulnerabilities"
        )

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

                # Generate fix with RL guidance
                fix = await self._generate_file_fix_with_guidance(
                    file_path=file_path,
                    original_content=original_file['content'],
                    vulnerabilities=file_vulns,
                    feedback_context=feedback_context,
                    rl_guidance=rl_guidance,
                    rag_patterns=rag_patterns
                )

                if fix:
                    fixes.append(fix)

            except Exception as e:
                logger.error(f"Error generating fix for {file_path}: {e}")
                continue

        logger.info(f"Generated {len(fixes)} fixes with RL guidance")
        return fixes

    async def _generate_file_fix_with_guidance(
        self,
        file_path: str,
        original_content: str,
        vulnerabilities: List[Dict[str, Any]],
        feedback_context: Optional[Dict[str, Any]] = None,
        rl_guidance: Optional[Dict[str, Any]] = None,
        rag_patterns: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Generate fix for a single file with RL guidance and RAG patterns"""

        # Prepare vulnerability descriptions
        vuln_descriptions = []
        for vuln in vulnerabilities:
            vuln_descriptions.append(
                f"- Line {vuln['line_number']}: {vuln['type']} ({vuln['severity']})\n"
                f"  {vuln['description']}\n"
                f"  Recommended fix: {vuln.get('recommended_fix', 'Apply secure coding practices')}"
            )

        # Build enhanced system prompt with RL guidance
        system_prompt = """You are an expert security engineer specializing in secure code remediation.

Your task is to fix security vulnerabilities in code while:
1. Maintaining functionality
2. Following best practices
3. Adding security controls
4. Preserving code style
5. Adding comments explaining security fixes
"""

        # Add RL guidance to system prompt if available
        if rl_guidance:
            system_prompt += "\n**IMPORTANT GUIDANCE FROM PREVIOUS ITERATIONS:**\n"

            if rl_guidance.get('risk_factors'):
                system_prompt += "\nRisk Factors to Avoid:\n"
                for risk in rl_guidance['risk_factors'][:3]:
                    system_prompt += f"- {risk}\n"

            if rl_guidance.get('recommended_adjustments'):
                system_prompt += "\nRecommended Adjustments:\n"
                for adjustment in rl_guidance['recommended_adjustments'][:5]:
                    system_prompt += f"- {adjustment}\n"

            approval_prob = rl_guidance.get('approval_probability', 0.5)
            system_prompt += f"\nPredicted approval probability: {approval_prob:.1%}\n"

        # Add feedback context if available
        if feedback_context and feedback_context.get('feedback_text'):
            system_prompt += f"\n**USER FEEDBACK FROM PREVIOUS ITERATION:**\n"
            system_prompt += f"\"{feedback_context['feedback_text']}\"\n"
            system_prompt += "\nMake sure to address the specific concerns raised in this feedback.\n"

        system_prompt += "\nOnly output the COMPLETE fixed file content. Do not include explanations before or after the code."

        # Build user prompt with RAG patterns
        user_prompt = f"""Fix the following security vulnerabilities in this file:

File: {file_path}

Vulnerabilities to fix:
{chr(10).join(vuln_descriptions)}
"""

        # Add RAG patterns if available
        if rag_patterns:
            user_prompt += "\n**SIMILAR SUCCESSFUL FIX PATTERNS:**\n"
            user_prompt += "Here are examples of successful fixes for similar vulnerabilities:\n\n"

            for i, pattern in enumerate(rag_patterns[:3], 1):
                user_prompt += f"Example {i} ({pattern.get('success_count', 1)} successful uses):\n"
                user_prompt += f"Vulnerability: {pattern.get('vulnerability_type')}\n"
                user_prompt += f"Fix approach: {pattern.get('fix_description')}\n"
                user_prompt += "Before:\n```\n"
                user_prompt += pattern.get('code_before', '')[:200]  # Show first 200 chars
                user_prompt += "\n```\nAfter:\n```\n"
                user_prompt += pattern.get('code_after', '')[:200]
                user_prompt += "\n```\n\n"

        user_prompt += f"""
Original code:
```
{original_content}
```

Provide the complete fixed file content with all vulnerabilities addressed.
Remember to:
- Address the user feedback if provided
- Follow the recommended adjustments from RL guidance
- Use successful patterns as inspiration (but adapt to this specific code)
"""

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

            # Create enhanced fix description
            description = f"Fixed {len(vulnerabilities)} security issue(s): " + ", ".join(
                v['type'] for v in vulnerabilities
            )

            if feedback_context and feedback_context.get('iteration_number'):
                description += f" (Iteration {feedback_context['iteration_number']} with RL guidance)"

            return {
                'file_path': file_path,
                'fixed_content': fixed_content,
                'original_content': original_content,
                'description': description,
                'vulnerabilities_fixed': [v['type'] for v in vulnerabilities],
                'rl_guidance_applied': rl_guidance is not None,
                'rag_patterns_used': len(rag_patterns) if rag_patterns else 0
            }

        except Exception as e:
            logger.error(f"Error calling LLM for fix generation: {e}")
            return None
