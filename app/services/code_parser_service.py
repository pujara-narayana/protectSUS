"""Code Parser Service for extracting code structure using AST"""

import ast
import re
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class CodeParserService:
    """Service for parsing code files and extracting structural information"""
    
    # Supported file extensions and their languages
    SUPPORTED_LANGUAGES = {
        '.py': 'python',
        '.js': 'javascript',
        '.ts': 'typescript',
        '.jsx': 'javascript',
        '.tsx': 'typescript',
        '.java': 'java',
        '.c': 'c',
        '.cpp': 'cpp',
        '.h': 'c',
        '.go': 'go',
        '.rs': 'rust',
        '.rb': 'ruby',
        '.php': 'php',
        '.sol': 'solidity',
    }
    
    @staticmethod
    async def parse_files(code_files: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Parse multiple code files and extract structure.
        
        Args:
            code_files: List of dicts with 'path' and 'content'
            
        Returns:
            Dict with files, functions, classes, imports, and relationships
        """
        result = {
            "files": [],
            "functions": [],
            "classes": [],
            "imports": [],
            "calls": [],
            "relationships": []
        }
        
        for file_info in code_files:
            path = file_info.get('path', '')
            content = file_info.get('content', '')
            
            if not path or not content:
                continue
            
            try:
                file_structure = await CodeParserService.parse_file(path, content)
                
                # Add file
                result["files"].append({
                    "path": path,
                    "language": file_structure.get("language", "unknown"),
                    "line_count": content.count('\n') + 1
                })
                
                # Add functions with file reference
                for func in file_structure.get("functions", []):
                    func["file_path"] = path
                    result["functions"].append(func)
                
                # Add classes with file reference
                for cls in file_structure.get("classes", []):
                    cls["file_path"] = path
                    result["classes"].append(cls)
                
                # Add imports with file reference
                for imp in file_structure.get("imports", []):
                    imp["file_path"] = path
                    result["imports"].append(imp)
                
                # Add function calls
                for call in file_structure.get("calls", []):
                    call["file_path"] = path
                    result["calls"].append(call)
                    
            except Exception as e:
                logger.warning(f"Failed to parse {path}: {e}")
                continue
        
        logger.info(
            f"Parsed {len(result['files'])} files: "
            f"{len(result['functions'])} functions, "
            f"{len(result['classes'])} classes, "
            f"{len(result['imports'])} imports"
        )
        
        return result
    
    @staticmethod
    async def parse_file(file_path: str, content: str) -> Dict[str, Any]:
        """
        Parse a single file and extract its structure.
        
        Returns:
            Dict with language, functions, classes, imports, calls
        """
        ext = Path(file_path).suffix.lower()
        language = CodeParserService.SUPPORTED_LANGUAGES.get(ext, 'unknown')
        
        result = {
            "language": language,
            "functions": [],
            "classes": [],
            "imports": [],
            "calls": []
        }
        
        if language == 'python':
            result = await CodeParserService._parse_python(content)
        elif language in ('javascript', 'typescript'):
            result = await CodeParserService._parse_javascript(content)
        elif language == 'java':
            result = await CodeParserService._parse_java(content)
        elif language in ('c', 'cpp'):
            result = await CodeParserService._parse_c(content)
        elif language == 'solidity':
            result = await CodeParserService._parse_solidity(content)
        else:
            # Generic regex-based parsing for other languages
            result = await CodeParserService._parse_generic(content)
        
        result["language"] = language
        return result
    
    @staticmethod
    async def _parse_python(content: str) -> Dict[str, Any]:
        """Parse Python code using the ast module"""
        result = {
            "functions": [],
            "classes": [],
            "imports": [],
            "calls": []
        }
        
        try:
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                # Extract function definitions
                if isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                    func_info = {
                        "name": node.name,
                        "line_start": node.lineno,
                        "line_end": node.end_lineno or node.lineno,
                        "args": [arg.arg for arg in node.args.args],
                        "is_async": isinstance(node, ast.AsyncFunctionDef),
                        "decorators": [
                            ast.unparse(d) if hasattr(ast, 'unparse') else str(d)
                            for d in node.decorator_list
                        ]
                    }
                    result["functions"].append(func_info)
                
                # Extract class definitions
                elif isinstance(node, ast.ClassDef):
                    bases = []
                    for base in node.bases:
                        if isinstance(base, ast.Name):
                            bases.append(base.id)
                        elif isinstance(base, ast.Attribute):
                            bases.append(ast.unparse(base) if hasattr(ast, 'unparse') else str(base))
                    
                    class_info = {
                        "name": node.name,
                        "line_start": node.lineno,
                        "line_end": node.end_lineno or node.lineno,
                        "bases": bases,
                        "methods": [
                            n.name for n in node.body 
                            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
                        ]
                    }
                    result["classes"].append(class_info)
                
                # Extract imports
                elif isinstance(node, ast.Import):
                    for alias in node.names:
                        result["imports"].append({
                            "module": alias.name,
                            "alias": alias.asname,
                            "line": node.lineno
                        })
                
                elif isinstance(node, ast.ImportFrom):
                    module = node.module or ""
                    for alias in node.names:
                        result["imports"].append({
                            "module": f"{module}.{alias.name}" if module else alias.name,
                            "from_module": module,
                            "name": alias.name,
                            "alias": alias.asname,
                            "line": node.lineno
                        })
                
                # Extract function calls
                elif isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Name):
                        result["calls"].append({
                            "name": node.func.id,
                            "line": node.lineno
                        })
                    elif isinstance(node.func, ast.Attribute):
                        result["calls"].append({
                            "name": node.func.attr,
                            "object": ast.unparse(node.func.value) if hasattr(ast, 'unparse') else str(node.func.value),
                            "line": node.lineno
                        })
                        
        except SyntaxError as e:
            logger.warning(f"Python syntax error: {e}")
        except Exception as e:
            logger.warning(f"Python parsing error: {e}")
        
        return result
    
    @staticmethod
    async def _parse_javascript(content: str) -> Dict[str, Any]:
        """Parse JavaScript/TypeScript using regex patterns"""
        result = {
            "functions": [],
            "classes": [],
            "imports": [],
            "calls": []
        }
        
        lines = content.split('\n')
        
        # Function patterns
        func_patterns = [
            r'function\s+(\w+)\s*\([^)]*\)',  # function name()
            r'const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>',  # const name = () =>
            r'const\s+(\w+)\s*=\s*(?:async\s*)?function',  # const name = function
            r'(\w+)\s*:\s*(?:async\s*)?\([^)]*\)\s*=>',  # name: () =>
            r'(?:async\s+)?(\w+)\s*\([^)]*\)\s*{',  # method definition in class
        ]
        
        for i, line in enumerate(lines, 1):
            for pattern in func_patterns:
                match = re.search(pattern, line)
                if match:
                    result["functions"].append({
                        "name": match.group(1),
                        "line_start": i,
                        "is_async": 'async' in line
                    })
                    break
        
        # Class pattern
        class_pattern = r'class\s+(\w+)(?:\s+extends\s+(\w+))?'
        for i, line in enumerate(lines, 1):
            match = re.search(class_pattern, line)
            if match:
                result["classes"].append({
                    "name": match.group(1),
                    "line_start": i,
                    "bases": [match.group(2)] if match.group(2) else []
                })
        
        # Import patterns
        import_patterns = [
            r'import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+[\'"]([^\'"]+)[\'"]',
            r'require\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)',
        ]
        for i, line in enumerate(lines, 1):
            for pattern in import_patterns:
                match = re.search(pattern, line)
                if match:
                    result["imports"].append({
                        "module": match.group(1),
                        "line": i
                    })
        
        return result
    
    @staticmethod
    async def _parse_java(content: str) -> Dict[str, Any]:
        """Parse Java using regex patterns"""
        result = {
            "functions": [],
            "classes": [],
            "imports": [],
            "calls": []
        }
        
        lines = content.split('\n')
        
        # Class pattern
        class_pattern = r'(?:public|private|protected)?\s*(?:abstract|final)?\s*class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?'
        for i, line in enumerate(lines, 1):
            match = re.search(class_pattern, line)
            if match:
                bases = [match.group(2)] if match.group(2) else []
                if match.group(3):
                    bases.extend([i.strip() for i in match.group(3).split(',')])
                result["classes"].append({
                    "name": match.group(1),
                    "line_start": i,
                    "bases": bases
                })
        
        # Method pattern
        method_pattern = r'(?:public|private|protected)?\s*(?:static)?\s*(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*\([^)]*\)'
        for i, line in enumerate(lines, 1):
            if 'class ' not in line:
                match = re.search(method_pattern, line)
                if match:
                    result["functions"].append({
                        "name": match.group(1),
                        "line_start": i
                    })
        
        # Import pattern
        import_pattern = r'import\s+([\w.]+);'
        for i, line in enumerate(lines, 1):
            match = re.search(import_pattern, line)
            if match:
                result["imports"].append({
                    "module": match.group(1),
                    "line": i
                })
        
        return result
    
    @staticmethod
    async def _parse_c(content: str) -> Dict[str, Any]:
        """Parse C/C++ using regex patterns"""
        result = {
            "functions": [],
            "classes": [],
            "imports": [],
            "calls": []
        }
        
        lines = content.split('\n')
        
        # Function pattern (simplified)
        func_pattern = r'(?:static|inline|extern)?\s*(?:\w+(?:\s*\*)?)\s+(\w+)\s*\([^)]*\)\s*{'
        for i, line in enumerate(lines, 1):
            match = re.search(func_pattern, line)
            if match:
                result["functions"].append({
                    "name": match.group(1),
                    "line_start": i
                })
        
        # Include pattern
        include_pattern = r'#include\s*[<"]([^>"]+)[>"]'
        for i, line in enumerate(lines, 1):
            match = re.search(include_pattern, line)
            if match:
                result["imports"].append({
                    "module": match.group(1),
                    "line": i
                })
        
        # Struct/class pattern
        struct_pattern = r'(?:struct|class)\s+(\w+)'
        for i, line in enumerate(lines, 1):
            match = re.search(struct_pattern, line)
            if match:
                result["classes"].append({
                    "name": match.group(1),
                    "line_start": i,
                    "bases": []
                })
        
        return result
    
    @staticmethod
    async def _parse_solidity(content: str) -> Dict[str, Any]:
        """Parse Solidity smart contracts"""
        result = {
            "functions": [],
            "classes": [],  # contracts
            "imports": [],
            "calls": []
        }
        
        lines = content.split('\n')
        
        # Contract pattern
        contract_pattern = r'(?:contract|interface|library)\s+(\w+)(?:\s+is\s+([^{]+))?'
        for i, line in enumerate(lines, 1):
            match = re.search(contract_pattern, line)
            if match:
                bases = []
                if match.group(2):
                    bases = [b.strip() for b in match.group(2).split(',')]
                result["classes"].append({
                    "name": match.group(1),
                    "line_start": i,
                    "bases": bases,
                    "type": "contract"
                })
        
        # Function pattern
        func_pattern = r'function\s+(\w+)\s*\([^)]*\)'
        for i, line in enumerate(lines, 1):
            match = re.search(func_pattern, line)
            if match:
                result["functions"].append({
                    "name": match.group(1),
                    "line_start": i,
                    "visibility": "public" if "public" in line else "private" if "private" in line else "internal"
                })
        
        # Import pattern
        import_pattern = r'import\s+[\'"]([^\'"]+)[\'"]'
        for i, line in enumerate(lines, 1):
            match = re.search(import_pattern, line)
            if match:
                result["imports"].append({
                    "module": match.group(1),
                    "line": i
                })
        
        return result
    
    @staticmethod
    async def _parse_generic(content: str) -> Dict[str, Any]:
        """Generic parsing using common patterns"""
        result = {
            "functions": [],
            "classes": [],
            "imports": [],
            "calls": []
        }
        
        lines = content.split('\n')
        
        # Generic function pattern
        func_pattern = r'(?:def|func|function|fn)\s+(\w+)\s*\('
        for i, line in enumerate(lines, 1):
            match = re.search(func_pattern, line)
            if match:
                result["functions"].append({
                    "name": match.group(1),
                    "line_start": i
                })
        
        # Generic class pattern
        class_pattern = r'class\s+(\w+)'
        for i, line in enumerate(lines, 1):
            match = re.search(class_pattern, line)
            if match:
                result["classes"].append({
                    "name": match.group(1),
                    "line_start": i,
                    "bases": []
                })
        
        return result
