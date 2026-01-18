"""Command parser for PR comment commands"""

import re
import json
import logging
from typing import Optional, Dict, Any

from app.core.llm_provider import LLMClient

logger = logging.getLogger(__name__)


class CommandParser:
    """Parse and process PR comment commands"""

    APPROVE_PATTERN = r'^\s*/approve\s*$'
    DENY_PATTERN = r'^\s*/deny\s*-\s*["\'](.+)["\']?\s*$'
    DENY_SIMPLE_PATTERN = r'^\s*/deny\s*-\s*(.+)\s*$'

    @staticmethod
    def parse_command(comment_body: str) -> Optional[Dict[str, Any]]:
        """
        Parse /approve or /deny commands from PR comment

        Args:
            comment_body: The comment text to parse

        Returns:
            Dictionary with command info or None if not a valid command:
            - {"command": "approve"} for /approve
            - {"command": "deny", "feedback_text": "..."} for /deny - "feedback"
        """
        if not comment_body:
            return None

        comment_body = comment_body.strip()

        # Check for /approve command
        if re.match(CommandParser.APPROVE_PATTERN, comment_body, re.IGNORECASE | re.MULTILINE):
            logger.info("Parsed /approve command")
            return {"command": "approve"}

        # Check for /deny command with feedback (with or without quotes)
        deny_match = re.match(CommandParser.DENY_PATTERN, comment_body, re.IGNORECASE | re.MULTILINE | re.DOTALL)
        if deny_match:
            feedback_text = deny_match.group(1).strip()
            logger.info(f"Parsed /deny command with feedback: {feedback_text[:50]}...")
            return {
                "command": "deny",
                "feedback_text": feedback_text
            }

        # Try simple pattern without quotes
        deny_simple_match = re.match(CommandParser.DENY_SIMPLE_PATTERN, comment_body, re.IGNORECASE | re.MULTILINE | re.DOTALL)
        if deny_simple_match:
            feedback_text = deny_simple_match.group(1).strip()
            # Remove leading/trailing quotes if present
            feedback_text = feedback_text.strip('"\'')
            logger.info(f"Parsed /deny command (simple) with feedback: {feedback_text[:50]}...")
            return {
                "command": "deny",
                "feedback_text": feedback_text
            }

        return None

    @staticmethod
    async def extract_feedback_features(feedback_text: str) -> Dict[str, Any]:
        """
        Use LLM to extract actionable feedback from denial message

        Args:
            feedback_text: User's feedback message

        Returns:
            Dictionary with extracted features:
            {
                "identified_issues": List[str] - List of issues identified
                "requested_changes": List[str] - Specific changes requested
                "false_positive_flags": List[str] - Mentions of false positives
                "breaking_change_concerns": bool - Whether breaking changes mentioned
                "sentiment": str - Overall sentiment (negative, neutral, positive)
                "specificity_score": float - How specific the feedback is (0-1)
            }
        """
        try:
            llm_client = LLMClient()

            system_prompt = """You are a feedback analyzer for security vulnerability fixes.
Extract structured information from user feedback on proposed security fixes.

Your task is to identify:
1. Specific issues with the proposed fix
2. Requested changes or improvements
3. Whether the user thinks this is a false positive
4. Concerns about breaking changes
5. Overall sentiment
6. How specific and actionable the feedback is

Be thorough but concise."""

            user_prompt = f"""Analyze this user feedback on a security fix PR:

"{feedback_text}"

Extract the following information and return ONLY valid JSON (no markdown, no code blocks):
{{
    "identified_issues": ["issue1", "issue2"],
    "requested_changes": ["change1", "change2"],
    "false_positive_flags": ["reason1", "reason2"],
    "breaking_change_concerns": true/false,
    "sentiment": "negative/neutral/positive",
    "specificity_score": 0.0-1.0
}}

If any field has no relevant content, use an empty array [] or appropriate default value."""

            response = await llm_client.generate(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.0,
                max_tokens=1024
            )

            response_text = response["text"].strip()

            # Remove markdown code blocks if present
            if response_text.startswith("```"):
                # Extract JSON from code block
                lines = response_text.split("\n")
                json_lines = []
                in_code_block = False
                for line in lines:
                    if line.strip().startswith("```"):
                        in_code_block = not in_code_block
                        continue
                    if in_code_block or (not line.strip().startswith("```")):
                        json_lines.append(line)
                response_text = "\n".join(json_lines).strip()

            features = json.loads(response_text)

            logger.info(f"Extracted feedback features: {features}")
            return features

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            logger.error(f"Response text: {response_text}")
            # Fallback to keyword-based extraction
            return CommandParser._fallback_feature_extraction(feedback_text)

        except Exception as e:
            logger.error(f"Error extracting feedback features with LLM: {e}")
            # Fallback to keyword-based extraction
            return CommandParser._fallback_feature_extraction(feedback_text)

    @staticmethod
    def _fallback_feature_extraction(feedback_text: str) -> Dict[str, Any]:
        """
        Fallback keyword-based feature extraction if LLM fails

        Args:
            feedback_text: User's feedback message

        Returns:
            Dictionary with extracted features using simple keyword matching
        """
        feedback_lower = feedback_text.lower()

        # Check for false positive keywords
        false_positive_keywords = ["false positive", "not a vulnerability", "not vulnerable", "not an issue", "incorrect"]
        false_positive_flags = [kw for kw in false_positive_keywords if kw in feedback_lower]

        # Check for breaking change keywords
        breaking_change_keywords = ["breaking", "breaks", "break", "production", "critical"]
        breaking_change_concerns = any(kw in feedback_lower for kw in breaking_change_keywords)

        # Simple sentiment analysis
        negative_keywords = ["wrong", "bad", "incorrect", "issue", "problem", "error", "bug"]
        positive_keywords = ["good", "great", "correct", "thanks", "appreciate"]

        negative_count = sum(1 for kw in negative_keywords if kw in feedback_lower)
        positive_count = sum(1 for kw in positive_keywords if kw in feedback_lower)

        if negative_count > positive_count:
            sentiment = "negative"
        elif positive_count > negative_count:
            sentiment = "positive"
        else:
            sentiment = "neutral"

        # Calculate specificity based on length and detail
        word_count = len(feedback_text.split())
        specificity_score = min(1.0, word_count / 50.0)  # More words = more specific, cap at 50 words

        return {
            "identified_issues": [feedback_text[:100]],  # Use first 100 chars as generic issue
            "requested_changes": [],
            "false_positive_flags": false_positive_flags,
            "breaking_change_concerns": breaking_change_concerns,
            "sentiment": sentiment,
            "specificity_score": specificity_score
        }

    @staticmethod
    def get_usage_instructions() -> str:
        """Get usage instructions for PR commands"""
        return """**protectSUS PR Commands:**

- `/approve` - Approve and auto-merge this fix
- `/deny - "feedback message"` - Reject this fix and request improvements

Examples:
- `/approve`
- `/deny - "This is a false positive, the input is already sanitized"`
- `/deny - "The fix breaks the API, please use a different approach"`
"""
