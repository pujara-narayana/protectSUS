"""Interactive chat service for querying analysis results"""

from typing import List, Dict, Any, Optional
import logging

from app.core.database import MongoDB
from app.core.config import settings
from app.core.llm_provider import LLMClient

logger = logging.getLogger(__name__)


class ChatService:
    """Service for interactive chat about analysis results"""

    @staticmethod
    async def process_message(
        analysis_id: str,
        message: str,
        history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Process chat message and generate response

        Args:
            analysis_id: Analysis ID to query
            message: User message
            history: Conversation history

        Returns:
            Dictionary with assistant response and sources
        """
        try:
            db = MongoDB.get_database()

            # Get analysis
            analysis = await db.analyses.find_one({'id': analysis_id})
            if not analysis:
                raise ValueError(f"Analysis {analysis_id} not found")

            # Prepare context from analysis
            context = ChatService._prepare_context(analysis)

            # Build messages for Claude
            messages = []
            for msg in history:
                messages.append({
                    'role': msg['role'],
                    'content': msg['content']
                })
            messages.append({
                'role': 'user',
                'content': message
            })

            # Call LLM
            llm_client = LLMClient()

            system_prompt = f"""You are a helpful security analysis assistant. Answer questions about the security analysis results.

Analysis Context:
{context}

Be specific and reference actual findings from the analysis. If asked about a vulnerability, provide details about its location, severity, and recommended fix."""

            # Prepare user message (combine history)
            user_message = messages[-1]['content'] if messages else ""

            response = await llm_client.generate(
                system_prompt=system_prompt,
                user_prompt=user_message,
                temperature=0.3,
                max_tokens=2048
            )

            assistant_message = response['text']

            # Extract sources (files/findings referenced)
            sources = ChatService._extract_sources(assistant_message, analysis)

            # Save chat message to history
            await db.chat_history.insert_one({
                'analysis_id': analysis_id,
                'role': 'user',
                'content': message,
                'timestamp': datetime.utcnow()
            })
            await db.chat_history.insert_one({
                'analysis_id': analysis_id,
                'role': 'assistant',
                'content': assistant_message,
                'timestamp': datetime.utcnow()
            })

            return {
                'message': assistant_message,
                'sources': sources
            }

        except Exception as e:
            logger.error(f"Error processing chat message: {e}", exc_info=True)
            raise

    @staticmethod
    def _prepare_context(analysis: Dict[str, Any]) -> str:
        """Prepare analysis context for Claude"""
        context = f"Repository: {analysis['repo_full_name']}\n"
        context += f"Commit: {analysis['commit_sha']}\n"
        context += f"Status: {analysis['status']}\n\n"

        if analysis.get('vulnerabilities'):
            context += "Vulnerabilities:\n"
            for i, vuln in enumerate(analysis['vulnerabilities'][:10], 1):
                context += f"{i}. {vuln['type']} in {vuln['file_path']}:{vuln['line_number']}\n"
                context += f"   Severity: {vuln['severity']}\n"
                context += f"   {vuln['description']}\n\n"

        if analysis.get('dependency_risks'):
            context += "\nDependency Risks:\n"
            for i, risk in enumerate(analysis['dependency_risks'][:10], 1):
                context += f"{i}. {risk['package_name']}@{risk['version']} ({risk['risk_level']})\n"

        return context

    @staticmethod
    def _extract_sources(message: str, analysis: Dict[str, Any]) -> List[str]:
        """Extract source references from message"""
        sources = []

        # Look for file paths mentioned
        for vuln in analysis.get('vulnerabilities', []):
            if vuln['file_path'] in message:
                sources.append(f"{vuln['file_path']}:{vuln['line_number']}")

        return list(set(sources))

    @staticmethod
    async def get_chat_history(analysis_id: str) -> List[Dict[str, Any]]:
        """Get chat history for an analysis"""
        try:
            db = MongoDB.get_database()
            cursor = db.chat_history.find(
                {'analysis_id': analysis_id}
            ).sort('timestamp', 1)

            history = []
            async for msg in cursor:
                history.append({
                    'role': msg['role'],
                    'content': msg['content'],
                    'timestamp': msg['timestamp']
                })

            return history

        except Exception as e:
            logger.error(f"Error retrieving chat history: {e}", exc_info=True)
            raise


from datetime import datetime
