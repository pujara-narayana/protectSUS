"""Service for storing and retrieving successful fix patterns (RAG)"""

import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path

from app.core.database import MongoDB

logger = logging.getLogger(__name__)


class FixPatternService:
    """MongoDB-based RAG for successful fix patterns"""

    @staticmethod
    async def store_successful_pattern(
        analysis_id: str,
        vulnerability_type: str,
        severity: str,
        file_path: str,
        code_before: str,
        code_after: str,
        fix_description: str,
        repo_full_name: str
    ) -> str:
        """
        Store approved fix pattern in MongoDB

        Args:
            analysis_id: ID of the analysis that was approved
            vulnerability_type: Type of vulnerability (e.g., SQL_INJECTION)
            severity: Severity level (low, medium, high, critical)
            file_path: Path to the file that was fixed
            code_before: Original vulnerable code
            code_after: Fixed code
            fix_description: Description of the fix
            repo_full_name: Full repository name

        Returns:
            Pattern ID
        """
        try:
            db = MongoDB.get_database()

            # Extract file extension
            file_extension = Path(file_path).suffix or "unknown"

            # Create a simple hash to detect similar patterns
            pattern_signature = f"{vulnerability_type}:{file_extension}:{fix_description}"

            # Check if similar pattern exists
            existing_pattern = await db.fix_patterns.find_one({
                'vulnerability_type': vulnerability_type,
                'file_extension': file_extension,
                'fix_description': fix_description
            })

            if existing_pattern:
                # Increment success count for existing pattern
                await db.fix_patterns.update_one(
                    {'id': existing_pattern['id']},
                    {
                        '$inc': {'success_count': 1},
                        '$set': {'last_used_at': datetime.utcnow()},
                        '$push': {'analysis_ids': analysis_id}
                    }
                )
                logger.info(f"Incremented success count for existing pattern {existing_pattern['id']}")
                return existing_pattern['id']

            # Create new pattern
            pattern_id = f"fix_pattern_{uuid.uuid4().hex[:12]}"
            pattern = {
                'id': pattern_id,
                'vulnerability_type': vulnerability_type,
                'severity': severity,
                'file_extension': file_extension,
                'file_path': file_path,
                'code_before': code_before,
                'code_after': code_after,
                'fix_description': fix_description,
                'analysis_ids': [analysis_id],
                'repo_full_name': repo_full_name,
                'approved_at': datetime.utcnow(),
                'last_used_at': datetime.utcnow(),
                'success_count': 1,
                'created_at': datetime.utcnow()
            }

            await db.fix_patterns.insert_one(pattern)
            logger.info(f"Stored new fix pattern {pattern_id} for {vulnerability_type}")

            return pattern_id

        except Exception as e:
            logger.error(f"Error storing fix pattern: {e}")
            raise

    @staticmethod
    async def get_similar_patterns(
        vulnerability_type: str,
        file_extension: str,
        severity: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Retrieve similar successful fix patterns for RAG

        Args:
            vulnerability_type: Type of vulnerability to search for
            file_extension: File extension (e.g., .py, .js)
            severity: Optional severity filter
            limit: Maximum number of patterns to return

        Returns:
            List of fix patterns sorted by success count
        """
        try:
            db = MongoDB.get_database()

            # Build query
            query = {
                'vulnerability_type': vulnerability_type,
                'file_extension': file_extension
            }

            if severity:
                query['severity'] = severity

            # Find patterns sorted by success count
            patterns = await db.fix_patterns.find(query).sort(
                'success_count', -1
            ).limit(limit).to_list(length=limit)

            logger.info(
                f"Found {len(patterns)} similar patterns for {vulnerability_type} "
                f"in {file_extension} files"
            )

            # Return only relevant fields
            return [
                {
                    'pattern_id': p['id'],
                    'vulnerability_type': p['vulnerability_type'],
                    'severity': p['severity'],
                    'file_extension': p['file_extension'],
                    'code_before': p['code_before'],
                    'code_after': p['code_after'],
                    'fix_description': p['fix_description'],
                    'success_count': p['success_count']
                }
                for p in patterns
            ]

        except Exception as e:
            logger.error(f"Error retrieving similar patterns: {e}")
            return []

    @staticmethod
    async def get_pattern_by_id(pattern_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific fix pattern by ID

        Args:
            pattern_id: Pattern ID

        Returns:
            Pattern document or None if not found
        """
        try:
            db = MongoDB.get_database()
            pattern = await db.fix_patterns.find_one({'id': pattern_id})
            return pattern

        except Exception as e:
            logger.error(f"Error retrieving pattern {pattern_id}: {e}")
            return None

    @staticmethod
    async def get_all_patterns_for_analysis(analysis_id: str) -> List[Dict[str, Any]]:
        """
        Get all fix patterns associated with an analysis

        Args:
            analysis_id: Analysis ID

        Returns:
            List of fix patterns
        """
        try:
            db = MongoDB.get_database()

            patterns = await db.fix_patterns.find({
                'analysis_ids': analysis_id
            }).to_list(length=None)

            logger.info(f"Found {len(patterns)} patterns for analysis {analysis_id}")
            return patterns

        except Exception as e:
            logger.error(f"Error retrieving patterns for analysis {analysis_id}: {e}")
            return []

    @staticmethod
    async def get_pattern_statistics() -> Dict[str, Any]:
        """
        Get statistics about stored fix patterns

        Returns:
            Dictionary with pattern statistics
        """
        try:
            db = MongoDB.get_database()

            total_patterns = await db.fix_patterns.count_documents({})

            # Get most common vulnerability types
            vulnerability_pipeline = [
                {
                    '$group': {
                        '_id': '$vulnerability_type',
                        'count': {'$sum': 1},
                        'total_successes': {'$sum': '$success_count'}
                    }
                },
                {'$sort': {'count': -1}},
                {'$limit': 10}
            ]

            vulnerability_stats = await db.fix_patterns.aggregate(
                vulnerability_pipeline
            ).to_list(length=10)

            # Get most common file extensions
            extension_pipeline = [
                {
                    '$group': {
                        '_id': '$file_extension',
                        'count': {'$sum': 1}
                    }
                },
                {'$sort': {'count': -1}},
                {'$limit': 10}
            ]

            extension_stats = await db.fix_patterns.aggregate(
                extension_pipeline
            ).to_list(length=10)

            return {
                'total_patterns': total_patterns,
                'vulnerability_types': vulnerability_stats,
                'file_extensions': extension_stats
            }

        except Exception as e:
            logger.error(f"Error getting pattern statistics: {e}")
            return {
                'total_patterns': 0,
                'vulnerability_types': [],
                'file_extensions': []
            }
