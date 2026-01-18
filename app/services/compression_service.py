"""Code compression service using Token Company API"""

import httpx
from typing import Dict, Any, List
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class CompressionService:
    """Service for compressing code using Token Company API"""

    def __init__(self):
        self.api_key = settings.TOKEN_COMPANY_API_KEY
        self.model = settings.TOKEN_COMPANY_MODEL
        self.base_url = "https://api.thetokencompany.com/v1"

    async def compress_code(
        self,
        code_files: List[Dict[str, Any]],
        target_tokens: int = 100000
    ) -> Dict[str, Any]:
        """
        Compress code files to reduce token count

        Args:
            code_files: List of code files with path and content
            target_tokens: Target token count

        Returns:
            Dictionary with compressed code and metadata
        """
        try:
            # Prepare code for compression
            combined_code = self._combine_code_files(code_files)

            logger.info(f"Compressing {len(code_files)} files, original size: {len(combined_code)} chars")

            # Call Token Company API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/compress",
                    json={
                        "model": self.model,
                        "compression_settings": {
                            "aggressiveness": 0.5,
                            "max_output_tokens": target_tokens,
                            "min_output_tokens": None
                        },
                        "input": combined_code
                    },
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    timeout=60.0
                )

                if response.status_code != 200:
                    logger.error(f"Compression API error: {response.text}")
                    # Fallback to simple compression if API fails
                    return self._fallback_compression(code_files, target_tokens)

                result = response.json()

                logger.info(
                    f"Compression successful: {result.get('original_input_tokens', 0)} -> "
                    f"{result.get('output_tokens', 0)} tokens "
                    f"(saved {result.get('original_input_tokens', 0) - result.get('output_tokens', 0)} tokens)"
                )

                compression_ratio = 1 - (result.get('output_tokens', 0) / max(result.get('original_input_tokens', 1), 1))

                return {
                    'compressed_code': result['output'],
                    'original_tokens': result.get('original_input_tokens', 0),
                    'compressed_tokens': result.get('output_tokens', 0),
                    'compression_ratio': compression_ratio,
                    'file_mapping': self._create_file_mapping(code_files, result.get('output', ''))
                }

        except Exception as e:
            logger.error(f"Error compressing code: {e}")
            # Fallback to simple compression
            return self._fallback_compression(code_files, target_tokens)

    def _combine_code_files(self, code_files: List[Dict[str, Any]]) -> str:
        """Combine code files into a single string with file markers"""
        combined = []
        for file in code_files:
            combined.append(f"// FILE: {file['path']}")
            combined.append(file['content'])
            combined.append("")  # Empty line separator
        return "\n".join(combined)

    def _create_file_mapping(self, code_files: List[Dict[str, Any]], compressed_code: str) -> Dict[str, Any]:
        """Create mapping between original files and compressed code"""
        # This is a simplified mapping - in production, the Token Company API
        # would provide detailed source mapping
        return {
            'total_files': len(code_files),
            'files': [f['path'] for f in code_files]
        }

    def _fallback_compression(
        self,
        code_files: List[Dict[str, Any]],
        target_tokens: int
    ) -> Dict[str, Any]:
        """
        Fallback compression using simple truncation

        This is used when the Token Company API is unavailable
        """
        logger.warning("Using fallback compression")

        # Sort files by importance (main files first, then by size)
        sorted_files = sorted(
            code_files,
            key=lambda f: (
                0 if 'main' in f['path'] or 'app' in f['path'] else 1,
                -f['size']
            )
        )

        # Combine files up to approximate token limit
        # Rough estimation: 1 token ≈ 4 characters
        char_limit = target_tokens * 4
        combined = []
        total_chars = 0

        for file in sorted_files:
            file_content = f"// FILE: {file['path']}\n{file['content']}\n"
            if total_chars + len(file_content) > char_limit:
                # Add truncated notice
                combined.append(f"// FILE: {file['path']} [TRUNCATED]")
                break
            combined.append(file_content)
            total_chars += len(file_content)

        compressed = "\n".join(combined)

        return {
            'compressed_code': compressed,
            'original_tokens': len(self._combine_code_files(code_files)) // 4,
            'compressed_tokens': len(compressed) // 4,
            'compression_ratio': len(compressed) / len(self._combine_code_files(code_files)),
            'file_mapping': {
                'total_files': len(code_files),
                'included_files': len([c for c in combined if 'FILE:' in c and 'TRUNCATED' not in c]),
                'files': [f['path'] for f in sorted_files[:len(combined)]]
            }
        }
