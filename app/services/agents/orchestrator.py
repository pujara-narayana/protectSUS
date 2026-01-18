"""Multi-agent orchestrator using LangGraph"""

from typing import Dict, Any, List
from langgraph.graph import StateGraph, END
from typing_extensions import TypedDict
import logging
import time

from app.services.agents.vulnerability_agent import VulnerabilityAgent
from app.services.agents.dependency_agent import DependencyAgent

logger = logging.getLogger(__name__)


class AnalysisState(TypedDict):
    """State for multi-agent analysis workflow"""
    code: str
    context: Dict[str, Any]
    vulnerabilities: List[Dict[str, Any]]
    dependency_risks: List[Dict[str, Any]]
    agent_analyses: List[Dict[str, Any]]
    debate_transcript: List[Dict[str, Any]]
    summary: str
    total_tokens_used: int
    errors: List[str]


class AgentOrchestrator:
    """Orchestrator for multi-agent security analysis using LangGraph"""

    def __init__(self, user_settings: dict = None):
        """
        Initialize orchestrator with optional user LLM settings.
        
        Args:
            user_settings: Optional dict with 'llm_provider' and 'api_key' keys
        """
        llm_provider = user_settings.get('llm_provider') if user_settings else None
        custom_api_key = user_settings.get('api_key') if user_settings else None
        
        self.vulnerability_agent = VulnerabilityAgent(llm_provider=llm_provider, custom_api_key=custom_api_key)
        self.dependency_agent = DependencyAgent(llm_provider=llm_provider, custom_api_key=custom_api_key)
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow"""
        workflow = StateGraph(AnalysisState)

        # Add nodes
        workflow.add_node("vulnerability_analysis", self._run_vulnerability_analysis)
        workflow.add_node("dependency_analysis", self._run_dependency_analysis)
        workflow.add_node("aggregate_results", self._aggregate_results)

        # Set entry point
        workflow.set_entry_point("vulnerability_analysis")

        # Add edges - run agents in parallel then aggregate
        workflow.add_edge("vulnerability_analysis", "dependency_analysis")
        workflow.add_edge("dependency_analysis", "aggregate_results")
        workflow.add_edge("aggregate_results", END)

        return workflow.compile()

    async def _run_vulnerability_analysis(self, state: AnalysisState) -> AnalysisState:
        """Run vulnerability assessment agent"""
        logger.info("Running vulnerability analysis node")
        try:
            start_time = time.time()
            result = await self.vulnerability_agent.analyze(state['code'], state['context'])
            execution_time = time.time() - start_time

            vulnerabilities = result.get('vulnerabilities', [])
            state['vulnerabilities'] = vulnerabilities
            state['agent_analyses'].append({
                'agent_name': 'VulnerabilityAgent',
                'findings': vulnerabilities,
                'execution_time': execution_time,
                'tokens_used': 0
            })
            
            # Add to debate transcript
            state['debate_transcript'].append({
                'agent': 'VulnerabilityAgent',
                'timestamp': time.time(),
                'action': 'analysis_complete',
                'finding_count': len(vulnerabilities),
                'reasoning': result.get('reasoning', f'Identified {len(vulnerabilities)} potential vulnerabilities'),
                'execution_time': execution_time
            })

            logger.info(f"Vulnerability analysis completed in {execution_time:.2f}s")

        except Exception as e:
            logger.error(f"Vulnerability analysis failed: {e}")
            state['errors'].append(f"VulnerabilityAgent: {str(e)}")
            state['debate_transcript'].append({
                'agent': 'VulnerabilityAgent',
                'timestamp': time.time(),
                'action': 'error',
                'error': str(e)
            })

        return state

    async def _run_dependency_analysis(self, state: AnalysisState) -> AnalysisState:
        """Run dependency risk assessment agent"""
        logger.info("Running dependency analysis node")
        try:
            start_time = time.time()
            result = await self.dependency_agent.analyze(state['code'], state['context'])
            execution_time = time.time() - start_time

            dependency_risks = result.get('dependency_risks', [])
            state['dependency_risks'] = dependency_risks
            state['agent_analyses'].append({
                'agent_name': 'DependencyAgent',
                'findings': dependency_risks,
                'execution_time': execution_time,
                'tokens_used': 0
            })
            
            # Add to debate transcript
            state['debate_transcript'].append({
                'agent': 'DependencyAgent',
                'timestamp': time.time(),
                'action': 'analysis_complete',
                'finding_count': len(dependency_risks),
                'reasoning': result.get('reasoning', f'Identified {len(dependency_risks)} dependency risks'),
                'execution_time': execution_time
            })

            logger.info(f"Dependency analysis completed in {execution_time:.2f}s")

        except Exception as e:
            logger.error(f"Dependency analysis failed: {e}")
            state['errors'].append(f"DependencyAgent: {str(e)}")
            state['debate_transcript'].append({
                'agent': 'DependencyAgent',
                'timestamp': time.time(),
                'action': 'error',
                'error': str(e)
            })

        return state

    async def _aggregate_results(self, state: AnalysisState) -> AnalysisState:
        """Aggregate results from all agents and generate summary"""
        logger.info("Aggregating results from all agents")

        # Calculate total tokens used
        state['total_tokens_used'] = sum(
            analysis.get('tokens_used', 0)
            for analysis in state['agent_analyses']
        )
        
        # Generate summary
        vuln_count = len(state['vulnerabilities'])
        dep_count = len(state['dependency_risks'])
        
        severity_counts = {}
        for v in state['vulnerabilities']:
            sev = v.get('severity', 'unknown')
            severity_counts[sev] = severity_counts.get(sev, 0) + 1
        
        summary_parts = [f"Security Analysis Complete."]
        if vuln_count > 0:
            summary_parts.append(f"Found {vuln_count} vulnerabilities")
            if severity_counts:
                sev_str = ', '.join(f"{c} {s}" for s, c in severity_counts.items())
                summary_parts.append(f"({sev_str})")
        else:
            summary_parts.append("No vulnerabilities found.")
        
        if dep_count > 0:
            summary_parts.append(f"Found {dep_count} dependency risks.")
        
        state['summary'] = ' '.join(summary_parts)
        
        # Add aggregation to debate transcript
        state['debate_transcript'].append({
            'agent': 'Orchestrator',
            'timestamp': time.time(),
            'action': 'aggregation_complete',
            'summary': state['summary'],
            'total_vulnerabilities': vuln_count,
            'total_dependency_risks': dep_count
        })

        logger.info(
            f"Analysis complete: {vuln_count} vulnerabilities, "
            f"{dep_count} dependency risks"
        )

        return state

    async def analyze(self, code: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run multi-agent analysis

        Args:
            code: Compressed code to analyze
            context: Analysis context (file mappings, metadata, etc.)

        Returns:
            Dictionary with all findings and agent analyses
        """
        logger.info("Starting multi-agent analysis orchestration")
        start_time = time.time()

        # Initialize state
        initial_state: AnalysisState = {
            'code': code,
            'context': context,
            'vulnerabilities': [],
            'dependency_risks': [],
            'agent_analyses': [],
            'debate_transcript': [],
            'summary': '',
            'total_tokens_used': 0,
            'errors': []
        }

        try:
            # Run the graph
            final_state = await self.graph.ainvoke(initial_state)

            total_time = time.time() - start_time

            result = {
                'vulnerabilities': final_state['vulnerabilities'],
                'dependency_risks': final_state['dependency_risks'],
                'agent_analyses': final_state['agent_analyses'],
                'debate_transcript': final_state['debate_transcript'],
                'summary': final_state['summary'],
                'total_execution_time': total_time,
                'total_tokens_used': final_state['total_tokens_used'],
                'errors': final_state['errors']
            }

            logger.info(f"Multi-agent analysis completed in {total_time:.2f}s")

            return result

        except Exception as e:
            logger.error(f"Multi-agent analysis failed: {e}", exc_info=True)
            raise
