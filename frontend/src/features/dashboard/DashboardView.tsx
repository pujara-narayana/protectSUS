import { getFileContent, getRepoTree } from "@/lib/github";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft,
  LogOut,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Info,
  Bot,
  Shield,
  Folder,
  File,
  Network,
  Loader2,
  Clock,
} from "lucide-react";
import KnowledgeGraphView from "./KnowledgeGraphView";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Types for analysis data
interface Vulnerability {
  type: string;
  severity: string;
  file_path: string;
  line_number: number;
  description: string;
  cwe_id?: string;
  recommended_fix?: string;
}

interface DependencyRisk {
  package_name: string;
  version: string;
  risk_level: string;
  vulnerabilities: string[];
  outdated: boolean;
}

interface DebateEntry {
  agent_name: string;
  message: string;
  timestamp?: string;
  finding_type?: string;
}

interface AnalysisData {
  id: string;
  repo_full_name: string;
  commit_sha: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  vulnerabilities: Vulnerability[];
  dependency_risks: DependencyRisk[];
  debate_transcript: DebateEntry[];
  summary?: string;
  pr_number?: number;
  pr_url?: string;
  created_at: string;
  completed_at?: string;
}

// ----------------------------------------------------------------------------
// Dashboard
// ----------------------------------------------------------------------------
export const Dashboard = ({
  repo,
  commit,
  onBack,
  onSignOut,
}: {
  repo: any;
  commit: any;
  onBack: () => void;
  onSignOut: () => void;
}) => {
  const { data: session } = useSession();
  const [tree, setTree] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"files" | "code" | "debate" | "kg">("files");

  // Analysis state
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [hasRecentAnalysis, setHasRecentAnalysis] = useState(false);

  // Fetch repository tree
  useEffect(() => {
    if (session && repo && commit) {
      getRepoTree(
        session.accessToken as string,
        repo.owner.login,
        repo.name,
        commit.sha
      ).then(setTree);
    }
  }, [session, repo, commit]);

  // Fetch analysis data from backend
  const fetchAnalysis = useCallback(async () => {
    if (!repo) return;

    setAnalysisLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/analysis/repo/${repo.owner.login}/${repo.name}?limit=1`
      );

      if (response.ok) {
        const data = await response.json();
        const analyses = data.analyses || [];

        if (analyses.length > 0) {
          const latestAnalysis = analyses[0];

          // Check if analysis is recent (within last 7 days)
          const analysisDate = new Date(latestAnalysis.created_at);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          if (analysisDate > sevenDaysAgo && latestAnalysis.status === "completed") {
            setAnalysis(latestAnalysis);
            setHasRecentAnalysis(true);
          } else {
            setAnalysis(null);
            setHasRecentAnalysis(false);
          }
        } else {
          setAnalysis(null);
          setHasRecentAnalysis(false);
        }
      } else {
        setAnalysis(null);
        setHasRecentAnalysis(false);
      }
    } catch (error) {
      console.error("Failed to fetch analysis:", error);
      setAnalysis(null);
      setHasRecentAnalysis(false);
    } finally {
      setAnalysisLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const handleFileClick = (file: any) => {
    setSelectedFile(file);
    setActiveTab("code");
    getFileContent(
      session?.accessToken as string,
      repo.owner.login,
      repo.name,
      file.path
    ).then(setFileContent);
  };

  // Calculate metrics from analysis
  const metrics = {
    overallRisk: analysis ? calculateOverallRisk(analysis) : null,
    criticalCount: analysis?.vulnerabilities.filter(v => v.severity === "critical").length ?? null,
    highCount: analysis?.vulnerabilities.filter(v => v.severity === "high").length ?? null,
    totalFindings: analysis?.vulnerabilities.length ?? null,
  };

  // Get verdict info
  const verdict = analysis ? getVerdict(analysis) : null;

  if (!repo || !commit) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm">Back</span>
              </button>
              <div className="border-l border-zinc-700 pl-4">
                <h2 className="text-base sm:text-lg font-semibold text-white truncate max-w-xs sm:max-w-md">
                  Commit #{commit.sha.substring(0, 5)} {commit.commit.message}
                </h2>
                <p className="text-xs text-zinc-500 font-mono truncate">{repo.name}</p>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Verdict Card */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 md:px-8 pt-6">
        <VerdictCard
          verdict={verdict}
          loading={analysisLoading}
          hasAnalysis={hasRecentAnalysis}
          prUrl={analysis?.pr_url}
        />
      </div>

      {/* Desktop Tab Navigation */}
      <div className="hidden md:block max-w-[1800px] mx-auto px-4 sm:px-6 md:px-8 pt-4">
        <div className="flex gap-2 border-b border-zinc-800 pb-4">
          <button
            onClick={() => setActiveTab("files")}
            className={`py-2 px-6 rounded-lg font-medium text-sm transition-colors ${activeTab === "files" || activeTab === "code" || activeTab === "debate"
              ? "bg-zinc-800 text-zinc-400"
              : "bg-zinc-800 text-zinc-400"
              }`}
          >
            <Folder className="w-4 h-4 inline mr-2" />
            Code Explorer
          </button>
          <button
            onClick={() => setActiveTab("kg")}
            className={`py-2 px-6 rounded-lg font-medium text-sm transition-colors ${activeTab === "kg"
              ? "bg-blue-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
          >
            <Network className="w-4 h-4 inline mr-2" />
            Knowledge Graph
          </button>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden max-w-[1800px] mx-auto px-4 sm:px-6 pt-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("files")}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${activeTab === "files"
              ? "bg-blue-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
          >
            File Explorer
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${activeTab === "code"
              ? "bg-blue-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
          >
            Code View
          </button>
          <button
            onClick={() => setActiveTab("debate")}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${activeTab === "debate"
              ? "bg-blue-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
          >
            Agent Debate
          </button>
          <button
            onClick={() => setActiveTab("kg")}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${activeTab === "kg"
              ? "bg-blue-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
          >
            <Network className="w-4 h-4 inline mr-1" />
            KG
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 md:px-8 py-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* File Explorer */}
          <div className={`col-span-1 md:col-span-2 ${activeTab === "files" ? "block" : "hidden"} ${activeTab === "kg" ? "hidden" : "md:block"}`}>
            <div className="md:h-[calc(120vh-16rem)] h-[60vh]">
              <div className="bg-zinc-900/30 rounded-lg border border-zinc-800 p-4 h-full overflow-y-auto">
                <FileTree tree={tree} onFileClick={handleFileClick} selectedFile={selectedFile} />
              </div>
            </div>
          </div>

          {/* Code View */}
          <div className={`col-span-1 md:col-span-7 ${activeTab === "code" ? "block" : "hidden"} ${activeTab === "kg" ? "hidden" : "md:block"}`}>
            <div className="md:h-[calc(120vh-16rem)] h-[60vh]">
              <div className="bg-[#1a1a1a] rounded-lg border border-zinc-800 overflow-hidden h-full flex flex-col">
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30 flex-shrink-0">
                  <code className="text-xs text-zinc-400 font-mono truncate">
                    {selectedFile?.path || commit.commit.message || "Select a file"}
                  </code>
                </div>
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
                  <pre>{fileContent}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* Agent Debate */}
          <div className={`col-span-1 md:col-span-3 ${activeTab === "debate" ? "block" : "hidden"} ${activeTab === "kg" ? "hidden" : "md:block"}`}>
            <div className="md:h-[calc(120vh-16rem)] h-[60vh]">
              <div className="h-full bg-zinc-900/30 rounded-lg border border-zinc-800 overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-sm font-semibold text-zinc-300">Agent Debate</h3>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {analysisLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    </div>
                  ) : hasRecentAnalysis && analysis?.vulnerabilities.length ? (
                    analysis.vulnerabilities.slice(0, 10).map((vuln, i) => (
                      <VulnerabilityCard key={i} vulnerability={vuln} />
                    ))
                  ) : (
                    <EmptyAgentDebate />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Knowledge Graph */}
        {activeTab === "kg" && (
          <div className="col-span-1 md:col-span-12">
            <KnowledgeGraphView repoFullName={`${repo.owner.login}/${repo.name}`} />
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 md:px-8 pb-6 w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Overall Risk"
            value={metrics.overallRisk !== null ? `${metrics.overallRisk}/100` : "—"}
            status={metrics.overallRisk !== null && metrics.overallRisk > 60 ? "critical" : metrics.overallRisk !== null && metrics.overallRisk > 30 ? "warning" : "safe"}
            icon={<AlertTriangle className="w-5 h-5" />}
            loading={analysisLoading}
            hasData={hasRecentAnalysis}
          />
          <MetricCard
            title="Critical Issues"
            value={metrics.criticalCount !== null ? String(metrics.criticalCount) : "—"}
            status={metrics.criticalCount !== null && metrics.criticalCount > 0 ? "critical" : "safe"}
            icon={<AlertCircle className="w-5 h-5" />}
            loading={analysisLoading}
            hasData={hasRecentAnalysis}
          />
          <MetricCard
            title="High Severity"
            value={metrics.highCount !== null ? String(metrics.highCount) : "—"}
            status={metrics.highCount !== null && metrics.highCount > 0 ? "warning" : "safe"}
            icon={<Info className="w-5 h-5" />}
            loading={analysisLoading}
            hasData={hasRecentAnalysis}
          />
          <MetricCard
            title="Total Findings"
            value={metrics.totalFindings !== null ? String(metrics.totalFindings) : "—"}
            status="safe"
            icon={<CheckCircle className="w-5 h-5" />}
            loading={analysisLoading}
            hasData={hasRecentAnalysis}
          />
        </div>
      </div>
    </div>
  );
};

// Helper functions
function calculateOverallRisk(analysis: AnalysisData): number {
  let score = 0;
  const vulns = analysis.vulnerabilities;

  score += vulns.filter(v => v.severity === "critical").length * 25;
  score += vulns.filter(v => v.severity === "high").length * 15;
  score += vulns.filter(v => v.severity === "medium").length * 7;
  score += vulns.filter(v => v.severity === "low").length * 2;

  return Math.min(100, score);
}

function getVerdict(analysis: AnalysisData): {
  title: string;
  confidence: number;
  description: string;
  fix: string;
  severity: "critical" | "high" | "medium" | "low" | "safe";
} | null {
  const criticalVulns = analysis.vulnerabilities.filter(v => v.severity === "critical");
  const highVulns = analysis.vulnerabilities.filter(v => v.severity === "high");

  if (criticalVulns.length > 0) {
    const mostCritical = criticalVulns[0];
    return {
      title: `CRITICAL: ${mostCritical.type.replace(/_/g, " ")}`,
      confidence: 94,
      description: mostCritical.description,
      fix: mostCritical.recommended_fix || "Review and fix the critical vulnerability",
      severity: "critical"
    };
  } else if (highVulns.length > 0) {
    const mostHigh = highVulns[0];
    return {
      title: `HIGH: ${mostHigh.type.replace(/_/g, " ")}`,
      confidence: 85,
      description: mostHigh.description,
      fix: mostHigh.recommended_fix || "Review and address the high-severity issue",
      severity: "high"
    };
  } else if (analysis.vulnerabilities.length > 0) {
    return {
      title: "MEDIUM: Security Issues Found",
      confidence: 78,
      description: analysis.summary || "Some security issues were detected that should be reviewed.",
      fix: "Review the findings and address them as needed",
      severity: "medium"
    };
  } else {
    return {
      title: "SECURE: No Critical Issues",
      confidence: 92,
      description: "No critical security vulnerabilities were detected in this codebase.",
      fix: "Continue following security best practices",
      severity: "safe"
    };
  }
}

// ----------------------------------------------------------------------------
// Metric Card
// ----------------------------------------------------------------------------
const MetricCard = ({
  title,
  value,
  status,
  icon,
  loading = false,
  hasData = true,
}: {
  title: string;
  value: string;
  status: "critical" | "warning" | "safe";
  icon: React.ReactNode;
  loading?: boolean;
  hasData?: boolean;
}) => {
  const statusClasses = {
    critical: "text-red-400",
    warning: "text-orange-400",
    safe: "text-emerald-400",
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-zinc-400 font-medium">{title}</span>
        <div className={hasData ? statusClasses[status] : "text-zinc-600"}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
        </div>
      </div>
      <div className={`text-2xl font-bold ${hasData ? statusClasses[status] : "text-zinc-600"}`}>
        {loading ? (
          <span className="text-zinc-600">...</span>
        ) : hasData ? (
          value
        ) : (
          <span className="text-zinc-600 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-normal">Pending audit</span>
          </span>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// File Tree
// ----------------------------------------------------------------------------
const FileTree = ({ tree, onFileClick, selectedFile }: { tree: any[], onFileClick: (file: any) => void, selectedFile: any }) => {
  return (
    <div className="space-y-1">
      {tree.filter(item => item.type === 'blob').map((file, i) => (
        <div
          key={i}
          onClick={() => onFileClick(file)}
          className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors group ${selectedFile?.path === file.path ? "bg-blue-600/20" : "hover:bg-zinc-800/50"
            }`}>
          <File className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-zinc-400 group-hover:text-white font-mono">
            {file.path}
          </span>
        </div>
      ))}
    </div>
  );
};

// ----------------------------------------------------------------------------
// Vulnerability Card (with real data)
// ----------------------------------------------------------------------------
const VulnerabilityCard = ({ vulnerability }: { vulnerability: Vulnerability }) => {
  const severityConfig = {
    critical: {
      icon: <AlertTriangle className="w-4 h-4" />,
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      text: "text-red-400",
    },
    high: {
      icon: <AlertCircle className="w-4 h-4" />,
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      text: "text-orange-400",
    },
    medium: {
      icon: <Info className="w-4 h-4" />,
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
      text: "text-yellow-400",
    },
    low: {
      icon: <CheckCircle className="w-4 h-4" />,
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      text: "text-emerald-400",
    },
  };

  const style = severityConfig[vulnerability.severity as keyof typeof severityConfig] || severityConfig.medium;

  return (
    <div className={`${style.bg} ${style.border} border rounded-lg p-4 flex-shrink-0`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={style.text}>{style.icon}</div>
        <div>
          <h4 className={`text-sm font-medium ${style.text}`}>
            {vulnerability.type.replace(/_/g, " ")}
          </h4>
          <p className="text-xs text-zinc-500">{vulnerability.file_path}:{vulnerability.line_number}</p>
        </div>
      </div>
      <div className="space-y-2 text-xs text-zinc-400">
        <p>{vulnerability.description}</p>
        {vulnerability.recommended_fix && (
          <div className="mt-2 pt-2 border-t border-zinc-700">
            <p className="text-emerald-400">Fix: {vulnerability.recommended_fix}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Empty Agent Debate State
// ----------------------------------------------------------------------------
const EmptyAgentDebate = () => (
  <div className="flex flex-col items-center justify-center h-full text-center p-6">
    <Bot className="w-12 h-12 text-zinc-700 mb-4" />
    <h4 className="text-zinc-400 font-medium mb-2">No Recent Analysis</h4>
    <p className="text-zinc-600 text-sm">
      This repository hasn't been audited recently. Push to the main branch or trigger a security scan to see agent debates and findings.
    </p>
  </div>
);

// ----------------------------------------------------------------------------
// Verdict Card (with real data)
// ----------------------------------------------------------------------------
const VerdictCard = ({
  verdict,
  loading,
  hasAnalysis,
  prUrl
}: {
  verdict: ReturnType<typeof getVerdict> | null;
  loading: boolean;
  hasAnalysis: boolean;
  prUrl?: string;
}) => {
  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5 h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!hasAnalysis || !verdict) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5 h-full flex flex-col">
        <div className="mb-3 flex-shrink-0 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-500 mb-1 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              AWAITING AUDIT
            </h3>
            <p className="text-xs text-zinc-600">No recent security analysis available</p>
          </div>
          <button className="py-2 px-4 bg-gradient-to-r from-zinc-700 to-zinc-600 rounded-lg text-zinc-300 text-sm font-semibold transition-all flex items-center gap-2 shadow-lg whitespace-nowrap cursor-not-allowed opacity-60">
            Trigger Audit
            <span className="text-base">→</span>
          </button>
        </div>
        <div className="text-xs text-zinc-600 flex-1">
          <p>
            Push code to the main branch or manually trigger a security audit to receive
            vulnerability analysis, agent debates, and fix recommendations.
          </p>
        </div>
      </div>
    );
  }

  const severityColors = {
    critical: "from-red-500/20 via-red-500/10 to-red-600/20 border-red-500/40 shadow-red-500/10",
    high: "from-orange-500/20 via-orange-500/10 to-orange-600/20 border-orange-500/40 shadow-orange-500/10",
    medium: "from-yellow-500/20 via-yellow-500/10 to-yellow-600/20 border-yellow-500/40 shadow-yellow-500/10",
    low: "from-emerald-500/20 via-emerald-500/10 to-emerald-600/20 border-emerald-500/40 shadow-emerald-500/10",
    safe: "from-emerald-500/20 via-emerald-500/10 to-emerald-600/20 border-emerald-500/40 shadow-emerald-500/10",
  };

  const textColors = {
    critical: "text-red-400",
    high: "text-orange-400",
    medium: "text-yellow-400",
    low: "text-emerald-400",
    safe: "text-emerald-400",
  };

  return (
    <div className={`bg-gradient-to-br ${severityColors[verdict.severity]} border rounded-lg p-5 shadow-lg h-full flex flex-col`}>
      <div className="mb-3 flex-shrink-0 flex items-center justify-between">
        <div>
          <h3 className={`text-base font-bold ${textColors[verdict.severity]} mb-1`}>
            VERDICT: {verdict.title}
          </h3>
          <p className={`text-xs ${textColors[verdict.severity]} opacity-70`}>
            Vulnerability Confidence: {verdict.confidence}%
          </p>
        </div>
        {prUrl ? (
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-800 hover:to-indigo-800 rounded-lg text-white text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-indigo-700/20 whitespace-nowrap"
          >
            View PR
            <span className="text-base">→</span>
          </a>
        ) : (
          <button className="py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-800 hover:to-indigo-800 rounded-lg text-white text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-indigo-700/20 whitespace-nowrap">
            Create New PR
            <span className="text-base">→</span>
          </button>
        )}
      </div>

      <div className="space-y-3 text-xs text-white/90 flex-1 flex-shrink-0">
        <p>{verdict.description}</p>

        <div className="pt-2 border-t border-white/10">
          <p className="font-semibold text-white mb-1">
            Recommended Fix:{" "}
            <span className="font-normal">{verdict.fix}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
