import { getFileContent, getRepoTree } from "@/lib/github";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
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
} from "lucide-react";
import KnowledgeGraphView from "./KnowledgeGraphView";

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

  const handleFileClick = (file: any) => {
    setSelectedFile(file);
    setActiveTab("code"); // Switch to code view on mobile
    getFileContent(
      session?.accessToken as string,
      repo.owner.login,
      repo.name,
      file.path
    ).then(setFileContent);
  };

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
        <VerdictCard />
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
          {/* File Explorer (Mobile: conditional, Desktop: always visible) */}
          <div className={`col-span-1 md:col-span-2 ${activeTab === "files" ? "block" : "hidden md:block"}`}>
            <div className="md:h-[calc(120vh-16rem)] h-[60vh]">
              <div className="bg-zinc-900/30 rounded-lg border border-zinc-800 p-4 h-full overflow-y-auto">
                <FileTree tree={tree} onFileClick={handleFileClick} selectedFile={selectedFile} />
              </div>
            </div>
          </div>

          {/* Code View (Mobile: conditional, Desktop: always visible) */}
          <div className={`col-span-1 md:col-span-7 ${activeTab === "code" ? "block" : "hidden md:block"}`}>
            <div className="md:h-[calc(120vh-16rem)] h-[60vh]">
              <div className="bg-[#1a1a1a] rounded-lg border border-zinc-800 overflow-hidden h-full flex flex-col">
                {/* Code Header */}
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30 flex-shrink-0">
                  <code className="text-xs text-zinc-400 font-mono truncate">
                    {selectedFile?.path || commit.commit.message || "main.py"}
                  </code>
                </div>
                {/* Code Content - scrollable */}
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
                  <pre>{fileContent}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* Agent Debate (Mobile: conditional, Desktop: always visible) */}
          <div className={`col-span-1 md:col-span-3 ${activeTab === "debate" ? "block" : "hidden md:block"}`}>
            <div className="md:h-[calc(120vh-16rem)] h-[60vh]">
              <div className="h-full bg-zinc-900/30 rounded-lg border border-zinc-800 overflow-hidden flex flex-col">
                {/* Agent Chat Header */}
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-sm font-semibold text-zinc-300">Agent Debate</h3>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  <VulnerabilityCard severity="safe" />
                  <VulnerabilityCard severity="critical" />
                  <VulnerabilityCard severity="safe" />
                  <VulnerabilityCard severity="critical" />
                  <VulnerabilityCard severity="safe" />
                  <VulnerabilityCard severity="critical" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Knowledge Graph (Mobile: conditional, Desktop: full width when active) */}
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
            value="88/100"
            status="critical"
            icon={<AlertTriangle className="w-5 h-5" />}
          />
          <MetricCard
            title="Critical Issues"
            value="2"
            status="critical"
            icon={<AlertCircle className="w-5 h-5" />}
          />
          <MetricCard
            title="High Severity"
            value="4"
            status="warning"
            icon={<Info className="w-5 h-5" />}
          />
          <MetricCard
            title="Total Findings"
            value="15"
            status="safe"
            icon={<CheckCircle className="w-5 h-5" />}
          />
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Metric Card
// ----------------------------------------------------------------------------
const MetricCard = ({
  title,
  value,
  status,
  icon,
}: {
  title: string;
  value: string;
  status: "critical" | "warning" | "safe";
  icon: React.ReactNode;
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
        <div className={statusClasses[status]}>{icon}</div>
      </div>
      <div className={`text-2xl font-bold ${statusClasses[status]}`}>
        {value}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Tab Button
// ----------------------------------------------------------------------------
const TabButton = ({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) => (
  <button
    className={`px-6 py-2 rounded-lg font-medium text-sm transition-colors ${active
        ? "bg-red-500/80 text-white"
        : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white"
      }`}
  >
    {children}
  </button>
);

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
// Vulnerability Card
// ----------------------------------------------------------------------------
const VulnerabilityCard = ({ severity }: { severity: "safe" | "critical" }) => {
  const config = {
    safe: {
      icon: <CheckCircle className="w-4 h-4" />,
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      text: "text-emerald-400",
      title: "Somethitn something issue summary name",
    },
    critical: {
      icon: <AlertTriangle className="w-4 h-4" />,
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      text: "text-red-400",
      title: "Somethitn something issue summary name",
    },
  };

  const style = config[severity];

  return (
    <div
      className={`${style.bg} ${style.border} border rounded-lg p-4 flex-shrink-0`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={style.text}>{style.icon}</div>
        <h4 className={`text-sm font-medium ${style.text}`}>{style.title}</h4>
      </div>
      <div className="space-y-2 text-xs text-zinc-400">
        <p>Critical issue detected. Look at this sequence:</p>
        <div className="font-mono bg-black/30 rounded p-2 space-y-1">
          <div>42 | balance[msg.sender] = 0;</div>
          <div>43 | msg.sender.call{"{value: amount}"}("");</div>
        </div>
        <p>
          The balance update happens BEFORE the external call. This is textbook
          re-entrancy - the attacker can call back before line 42 executes and
          withdraw multiple times.
        </p>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Verdict Card
// ----------------------------------------------------------------------------
const VerdictCard = () => (
  <div className="bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-blue-600/20 border border-blue-500/40 rounded-lg p-5 shadow-lg shadow-blue-500/10 h-full flex flex-col">
    <div className="mb-3 flex-shrink-0 flex items-center justify-between">
      <div>
        <h3 className="text-base font-bold text-blue-400 mb-1">
          VERDICT: CRITICAL Re-entrancy
        </h3>
        <p className="text-xs text-blue-400/70">Vulnerability Confidence: 94%</p>
      </div>
      <button className="py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-800 hover:to-indigo-800 rounded-lg text-white text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-indigo-700/20 whitespace-nowrap">
        Create New PR
        <span className="text-base">→</span>
      </button>
    </div>

    <div className="space-y-3 text-xs text-white/90 flex-1 flex-shrink-0">
      <p>
        The Auditor's analysis is correct. While the nonReentrant modifier on
        line 15 blocks direct re-entrancy, the internal callback() function on
        line 89 creates an unprotected re-entry point that attackers can exploit
        during the external call.
      </p>

      <div className="pt-2 border-t border-blue-500/20">
        <p className="font-semibold text-white mb-1">
          Recommended Fix:{" "}
          <span className="font-normal">
            Apply nonReentrant modifier to callback()
          </span>
        </p>
      </div>
    </div>
  </div>
);
