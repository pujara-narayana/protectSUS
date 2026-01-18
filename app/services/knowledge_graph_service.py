"""Knowledge Graph service for tracking code relationships and vulnerabilities"""

from typing import Dict, Any, List, Optional
from neo4j import AsyncSession
import logging

from app.core.database import Neo4jDB

logger = logging.getLogger(__name__)


class KnowledgeGraphService:
    """Service for managing knowledge graph of code relationships"""

    @staticmethod
    async def create_repository_node(
        repo_full_name: str,
        metadata: Dict[str, Any]
    ):
        """Create or update repository node"""
        try:
            driver = Neo4jDB.get_driver()

            async with driver.session() as session:
                await session.run(
                    """
                    MERGE (r:Repository {full_name: $full_name})
                    SET r.name = $name,
                        r.owner = $owner,
                        r.created_at = datetime($created_at),
                        r.updated_at = datetime()
                    RETURN r
                    """,
                    full_name=repo_full_name,
                    name=repo_full_name.split('/')[-1],
                    owner=repo_full_name.split('/')[0],
                    created_at=metadata.get('created_at', 'now')
                )

            logger.info(f"Created/updated repository node: {repo_full_name}")

        except Exception as e:
            logger.error(f"Error creating repository node: {e}")
            raise

    @staticmethod
    async def create_file_nodes(
        repo_full_name: str,
        files: List[Dict[str, Any]]
    ):
        """Create file nodes and link to repository"""
        try:
            driver = Neo4jDB.get_driver()

            async with driver.session() as session:
                for file in files:
                    await session.run(
                        """
                        MATCH (r:Repository {full_name: $repo_full_name})
                        MERGE (f:File {path: $path, repository: $repo_full_name})
                        SET f.extension = $extension,
                            f.size = $size,
                            f.updated_at = datetime()
                        MERGE (r)-[:CONTAINS]->(f)
                        """,
                        repo_full_name=repo_full_name,
                        path=file['path'],
                        extension=file.get('extension', ''),
                        size=file.get('size', 0)
                    )

            logger.info(f"Created {len(files)} file nodes")

        except Exception as e:
            logger.error(f"Error creating file nodes: {e}")
            raise

    @staticmethod
    async def create_vulnerability_nodes(
        analysis_id: str,
        repo_full_name: str,
        vulnerabilities: List[Dict[str, Any]]
    ):
        """Create vulnerability nodes and link to files"""
        try:
            driver = Neo4jDB.get_driver()

            async with driver.session() as session:
                for vuln in vulnerabilities:
                    await session.run(
                        """
                        MATCH (f:File {path: $file_path, repository: $repo_full_name})
                        CREATE (v:Vulnerability {
                            id: $vuln_id,
                            type: $type,
                            severity: $severity,
                            line_number: $line_number,
                            description: $description,
                            cwe_id: $cwe_id,
                            analysis_id: $analysis_id,
                            created_at: datetime()
                        })
                        CREATE (f)-[:HAS_VULNERABILITY]->(v)
                        """,
                        file_path=vuln['file_path'],
                        repo_full_name=repo_full_name,
                        vuln_id=f"{analysis_id}_{vuln['type']}_{vuln['line_number']}",
                        type=vuln['type'],
                        severity=vuln['severity'],
                        line_number=vuln['line_number'],
                        description=vuln.get('description', ''),
                        cwe_id=vuln.get('cwe_id', ''),
                        analysis_id=analysis_id
                    )

            logger.info(f"Created {len(vulnerabilities)} vulnerability nodes")

        except Exception as e:
            logger.error(f"Error creating vulnerability nodes: {e}")
            raise

    @staticmethod
    async def create_dependency_nodes(
        repo_full_name: str,
        dependencies: List[Dict[str, Any]]
    ):
        """Create dependency nodes and link to repository"""
        try:
            driver = Neo4jDB.get_driver()

            async with driver.session() as session:
                for dep in dependencies:
                    await session.run(
                        """
                        MATCH (r:Repository {full_name: $repo_full_name})
                        MERGE (d:Dependency {
                            package_name: $package_name,
                            version: $version
                        })
                        SET d.risk_level = $risk_level,
                            d.outdated = $outdated,
                            d.latest_version = $latest_version
                        MERGE (r)-[:DEPENDS_ON]->(d)
                        """,
                        repo_full_name=repo_full_name,
                        package_name=dep['package_name'],
                        version=dep['version'],
                        risk_level=dep.get('risk_level', 'low'),
                        outdated=dep.get('outdated', False),
                        latest_version=dep.get('latest_version', '')
                    )

            logger.info(f"Created {len(dependencies)} dependency nodes")

        except Exception as e:
            logger.error(f"Error creating dependency nodes: {e}")
            raise

    @staticmethod
    async def get_repository_vulnerabilities(
        repo_full_name: str,
        severity_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get all vulnerabilities for a repository"""
        try:
            driver = Neo4jDB.get_driver()

            query = """
            MATCH (r:Repository {full_name: $repo_full_name})-[:CONTAINS]->(f:File)-[:HAS_VULNERABILITY]->(v:Vulnerability)
            """

            if severity_filter:
                query += " WHERE v.severity = $severity"

            query += """
            RETURN v, f.path as file_path
            ORDER BY v.created_at DESC
            LIMIT 100
            """

            async with driver.session() as session:
                result = await session.run(
                    query,
                    repo_full_name=repo_full_name,
                    severity=severity_filter
                )

                vulnerabilities = []
                async for record in result:
                    vuln = dict(record['v'])
                    vuln['file_path'] = record['file_path']
                    vulnerabilities.append(vuln)

                return vulnerabilities

        except Exception as e:
            logger.error(f"Error getting repository vulnerabilities: {e}")
            return []

    @staticmethod
    async def get_vulnerability_patterns(
        vulnerability_type: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Find common patterns for a vulnerability type across repositories"""
        try:
            driver = Neo4jDB.get_driver()

            async with driver.session() as session:
                result = await session.run(
                    """
                    MATCH (v:Vulnerability {type: $type})<-[:HAS_VULNERABILITY]-(f:File)<-[:CONTAINS]-(r:Repository)
                    RETURN r.full_name as repository,
                           f.path as file_path,
                           f.extension as extension,
                           count(v) as count
                    ORDER BY count DESC
                    LIMIT $limit
                    """,
                    type=vulnerability_type,
                    limit=limit
                )

                patterns = []
                async for record in result:
                    patterns.append({
                        'repository': record['repository'],
                        'file_path': record['file_path'],
                        'extension': record['extension'],
                        'count': record['count']
                    })

                return patterns

        except Exception as e:
            logger.error(f"Error getting vulnerability patterns: {e}")
            return []

    @staticmethod
    async def get_high_risk_files(
        repo_full_name: str,
        min_vulnerabilities: int = 2
    ) -> List[Dict[str, Any]]:
        """Get files with multiple vulnerabilities (hotspots)"""
        try:
            driver = Neo4jDB.get_driver()

            async with driver.session() as session:
                result = await session.run(
                    """
                    MATCH (r:Repository {full_name: $repo_full_name})-[:CONTAINS]->(f:File)-[:HAS_VULNERABILITY]->(v:Vulnerability)
                    WITH f, count(v) as vuln_count, collect(v.type) as vuln_types
                    WHERE vuln_count >= $min_vulnerabilities
                    RETURN f.path as file_path,
                           vuln_count,
                           vuln_types
                    ORDER BY vuln_count DESC
                    """,
                    repo_full_name=repo_full_name,
                    min_vulnerabilities=min_vulnerabilities
                )

                hotspots = []
                async for record in result:
                    hotspots.append({
                        'file_path': record['file_path'],
                        'vulnerability_count': record['vuln_count'],
                        'vulnerability_types': record['vuln_types']
                    })

                return hotspots

        except Exception as e:
            logger.error(f"Error getting high-risk files: {e}")
            return []

    @staticmethod
    async def create_analysis_summary_node(
        analysis_id: str,
        repo_full_name: str,
        summary: str,
        debate_highlights: List[str] = None
    ):
        """
        Create an analysis summary node in Neo4j linked to the repository.
        
        Args:
            analysis_id: Unique analysis identifier
            repo_full_name: Full repository name (owner/repo)
            summary: Analysis summary text
            debate_highlights: Optional list of key points from agent debate
        """
        try:
            driver = Neo4jDB.get_driver()

            async with driver.session() as session:
                await session.run(
                    """
                    MERGE (r:Repository {full_name: $repo_full_name})
                    ON CREATE SET r.name = $repo_name,
                                  r.owner = $repo_owner,
                                  r.created_at = datetime()
                    SET r.updated_at = datetime()
                    MERGE (a:Analysis {id: $analysis_id})
                    SET a.summary = $summary,
                        a.debate_highlights = $debate_highlights,
                        a.created_at = datetime(),
                        a.repository = $repo_full_name
                    MERGE (r)-[:HAS_ANALYSIS]->(a)
                    """,
                    repo_full_name=repo_full_name,
                    repo_name=repo_full_name.split("/")[-1],
                    repo_owner=repo_full_name.split("/")[0],
                    analysis_id=analysis_id,
                    summary=summary,
                    debate_highlights=debate_highlights or []
                )

            logger.info(f"Created analysis summary node: {analysis_id}")

        except Exception as e:
            logger.error(f"Error creating analysis summary node: {e}")
            raise

    @staticmethod
    async def get_repo_graph_data(repo_full_name: str) -> Dict[str, Any]:
        """
        Get complete knowledge graph data for a repository for visualization.
        
        Returns nodes and edges in a format suitable for graph visualization libraries.
        
        Args:
            repo_full_name: Full repository name (owner/repo)
            
        Returns:
            Dictionary with nodes, edges, and stats
        """
        try:
            driver = Neo4jDB.get_driver()
            nodes = []
            edges = []
            
            async with driver.session() as session:
                # Get repository node
                repo_result = await session.run(
                    """
                    MATCH (r:Repository {full_name: $repo_full_name})
                    RETURN r
                    """,
                    repo_full_name=repo_full_name
                )
                async for record in repo_result:
                    repo = dict(record['r'])
                    nodes.append({
                        "id": f"repo:{repo_full_name}",
                        "type": "repository",
                        "label": repo_full_name.split("/")[-1],
                        "data": repo
                    })
                
                # Get file nodes and edges
                file_result = await session.run(
                    """
                    MATCH (r:Repository {full_name: $repo_full_name})-[:CONTAINS]->(f:File)
                    RETURN f
                    """,
                    repo_full_name=repo_full_name
                )
                async for record in file_result:
                    file = dict(record['f'])
                    file_id = f"file:{file.get('path', '')}"
                    nodes.append({
                        "id": file_id,
                        "type": "file",
                        "label": file.get('path', '').split("/")[-1],
                        "data": file
                    })
                    edges.append({
                        "source": f"repo:{repo_full_name}",
                        "target": file_id,
                        "type": "CONTAINS"
                    })
                
                # Get vulnerability nodes and edges
                vuln_result = await session.run(
                    """
                    MATCH (r:Repository {full_name: $repo_full_name})-[:CONTAINS]->(f:File)-[:HAS_VULNERABILITY]->(v:Vulnerability)
                    RETURN f.path as file_path, v
                    """,
                    repo_full_name=repo_full_name
                )
                async for record in vuln_result:
                    vuln = dict(record['v'])
                    vuln_id = f"vuln:{vuln.get('id', '')}"
                    file_path = record['file_path']
                    nodes.append({
                        "id": vuln_id,
                        "type": "vulnerability",
                        "label": vuln.get('type', 'Unknown'),
                        "severity": vuln.get('severity', 'unknown'),
                        "data": vuln
                    })
                    edges.append({
                        "source": f"file:{file_path}",
                        "target": vuln_id,
                        "type": "HAS_VULNERABILITY"
                    })
                
                # Get dependency nodes and edges
                dep_result = await session.run(
                    """
                    MATCH (r:Repository {full_name: $repo_full_name})-[:DEPENDS_ON]->(d:Dependency)
                    RETURN d
                    """,
                    repo_full_name=repo_full_name
                )
                async for record in dep_result:
                    dep = dict(record['d'])
                    dep_id = f"dep:{dep.get('package_name', '')}@{dep.get('version', '')}"
                    nodes.append({
                        "id": dep_id,
                        "type": "dependency",
                        "label": f"{dep.get('package_name', '')}@{dep.get('version', '')}",
                        "risk_level": dep.get('risk_level', 'low'),
                        "data": dep
                    })
                    edges.append({
                        "source": f"repo:{repo_full_name}",
                        "target": dep_id,
                        "type": "DEPENDS_ON"
                    })
                
                # Get analysis nodes and edges
                analysis_result = await session.run(
                    """
                    MATCH (r:Repository {full_name: $repo_full_name})-[:HAS_ANALYSIS]->(a:Analysis)
                    RETURN a
                    ORDER BY a.created_at DESC
                    LIMIT 10
                    """,
                    repo_full_name=repo_full_name
                )
                async for record in analysis_result:
                    analysis = dict(record['a'])
                    analysis_id = f"analysis:{analysis.get('id', '')}"
                    nodes.append({
                        "id": analysis_id,
                        "type": "analysis",
                        "label": f"Analysis {analysis.get('id', '')[:8]}",
                        "data": {
                            "id": analysis.get('id'),
                            "summary": analysis.get('summary', ''),
                            "created_at": str(analysis.get('created_at', ''))
                        }
                    })
                    edges.append({
                        "source": f"repo:{repo_full_name}",
                        "target": analysis_id,
                        "type": "HAS_ANALYSIS"
                    })
            
            # Calculate stats
            stats = {
                "total_nodes": len(nodes),
                "total_edges": len(edges),
                "files": len([n for n in nodes if n["type"] == "file"]),
                "vulnerabilities": len([n for n in nodes if n["type"] == "vulnerability"]),
                "dependencies": len([n for n in nodes if n["type"] == "dependency"]),
                "analyses": len([n for n in nodes if n["type"] == "analysis"])
            }
            
            logger.info(f"Retrieved graph data for {repo_full_name}: {stats}")
            
            return {
                "nodes": nodes,
                "edges": edges,
                "stats": stats
            }
            
        except Exception as e:
            logger.error(f"Error getting repo graph data: {e}")
            return {"nodes": [], "edges": [], "stats": {}}

    @staticmethod
    async def index_codebase(
        repo_full_name: str,
        code_structure: Dict[str, Any]
    ):
        """
        Index the entire codebase structure in Neo4j.
        
        Creates nodes for Files, Functions, Classes, and their relationships.
        
        Args:
            repo_full_name: Full repository name (owner/repo)
            code_structure: Parsed code structure from CodeParserService
        """
        try:
            driver = Neo4jDB.get_driver()
            
            async with driver.session() as session:
                # Ensure repository exists
                await session.run(
                    """
                    MERGE (r:Repository {full_name: $repo_full_name})
                    ON CREATE SET r.name = $repo_name,
                                  r.owner = $repo_owner,
                                  r.created_at = datetime()
                    SET r.updated_at = datetime(),
                        r.indexed_at = datetime()
                    """,
                    repo_full_name=repo_full_name,
                    repo_name=repo_full_name.split("/")[-1],
                    repo_owner=repo_full_name.split("/")[0]
                )
                
                # Create File nodes
                for file_info in code_structure.get("files", []):
                    await session.run(
                        """
                        MATCH (r:Repository {full_name: $repo_full_name})
                        MERGE (f:File {path: $path, repository: $repo_full_name})
                        SET f.language = $language,
                            f.line_count = $line_count,
                            f.updated_at = datetime()
                        MERGE (r)-[:CONTAINS]->(f)
                        """,
                        repo_full_name=repo_full_name,
                        path=file_info["path"],
                        language=file_info.get("language", "unknown"),
                        line_count=file_info.get("line_count", 0)
                    )
                
                # Create Function nodes
                for func_info in code_structure.get("functions", []):
                    await session.run(
                        """
                        MATCH (f:File {path: $file_path, repository: $repo_full_name})
                        MERGE (fn:Function {
                            name: $name,
                            file_path: $file_path,
                            repository: $repo_full_name
                        })
                        SET fn.line_start = $line_start,
                            fn.line_end = $line_end,
                            fn.is_async = $is_async,
                            fn.args = $args,
                            fn.updated_at = datetime()
                        MERGE (f)-[:DEFINES]->(fn)
                        """,
                        repo_full_name=repo_full_name,
                        file_path=func_info["file_path"],
                        name=func_info["name"],
                        line_start=func_info.get("line_start", 0),
                        line_end=func_info.get("line_end", 0),
                        is_async=func_info.get("is_async", False),
                        args=func_info.get("args", [])
                    )
                
                # Create Class nodes
                for class_info in code_structure.get("classes", []):
                    await session.run(
                        """
                        MATCH (f:File {path: $file_path, repository: $repo_full_name})
                        MERGE (c:Class {
                            name: $name,
                            file_path: $file_path,
                            repository: $repo_full_name
                        })
                        SET c.line_start = $line_start,
                            c.line_end = $line_end,
                            c.bases = $bases,
                            c.methods = $methods,
                            c.updated_at = datetime()
                        MERGE (f)-[:DEFINES]->(c)
                        """,
                        repo_full_name=repo_full_name,
                        file_path=class_info["file_path"],
                        name=class_info["name"],
                        line_start=class_info.get("line_start", 0),
                        line_end=class_info.get("line_end", 0),
                        bases=class_info.get("bases", []),
                        methods=class_info.get("methods", [])
                    )
                    
                    # Create EXTENDS relationships
                    for base in class_info.get("bases", []):
                        await session.run(
                            """
                            MATCH (c:Class {name: $class_name, repository: $repo_full_name})
                            MERGE (bc:Class {name: $base_name, repository: $repo_full_name})
                            MERGE (c)-[:EXTENDS]->(bc)
                            """,
                            repo_full_name=repo_full_name,
                            class_name=class_info["name"],
                            base_name=base
                        )
                
                # Create Module/Import nodes
                for import_info in code_structure.get("imports", []):
                    module_name = import_info.get("module", "")
                    if module_name:
                        await session.run(
                            """
                            MATCH (f:File {path: $file_path, repository: $repo_full_name})
                            MERGE (m:Module {name: $module_name})
                            MERGE (f)-[:IMPORTS]->(m)
                            """,
                            repo_full_name=repo_full_name,
                            file_path=import_info["file_path"],
                            module_name=module_name
                        )
                
                # Create CALLS relationships (function to function)
                for call_info in code_structure.get("calls", []):
                    await session.run(
                        """
                        MATCH (f:File {path: $file_path, repository: $repo_full_name})-[:DEFINES]->(caller:Function)
                        WHERE caller.line_start <= $call_line
                        WITH caller ORDER BY caller.line_start DESC LIMIT 1
                        MERGE (called:Function {name: $called_name, repository: $repo_full_name})
                        MERGE (caller)-[:CALLS]->(called)
                        """,
                        repo_full_name=repo_full_name,
                        file_path=call_info["file_path"],
                        call_line=call_info.get("line", 0),
                        called_name=call_info["name"]
                    )
            
            # Log summary
            stats = {
                "files": len(code_structure.get("files", [])),
                "functions": len(code_structure.get("functions", [])),
                "classes": len(code_structure.get("classes", [])),
                "imports": len(code_structure.get("imports", []))
            }
            logger.info(f"Indexed codebase for {repo_full_name}: {stats}")
            
        except Exception as e:
            logger.error(f"Error indexing codebase: {e}")
            raise

