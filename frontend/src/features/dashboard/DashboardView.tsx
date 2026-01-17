
import {
  ChevronLeft,
  LogOut,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Info,
  Bot,
  Shield,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Dashboard
// ----------------------------------------------------------------------------
export const Dashboard = ({ repo, commit, onBack, onSignOut }: { repo: any; commit: any; onBack: () => void; onSignOut: () => void; }) => {
  if (!repo || !commit) return null;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="border-b border-zinc-800 bg-zinc-900/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
              <div>
                <h2 className="text-xl font-semibold text-white">{repo.name}</h2>
                <code className="text-sm text-zinc-400 font-mono">{commit.sha.substring(0,12)}...</code>
              </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-status-safe/10 border border-status-safe/20 rounded-lg">
                  <div className="w-2 h-2 bg-status-safe rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-status-safe">Scan Active</span>
                </div>
                <button onClick={onSignOut} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <MetricCard title="Overall Risk" value="88/100" status="critical" icon={<AlertTriangle />} />
          <MetricCard title="Critical Issues" value="2" status="critical" icon={<AlertCircle />} />
          <MetricCard title="High Severity" value="4" status="warning" icon={<Info />} />
          <MetricCard title="Total Findings" value="15" status="safe" icon={<CheckCircle />} />
        </div>

        <div className="grid lg:grid-cols-12 gap-6 mb-8">
          <AgentSidebar type="auditor" />
          <CodeAnalysisPanel />
          <AgentSidebar type="defender" />
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, status, icon }: { title: string, value: string, status: 'critical' | 'warning' | 'safe', icon: React.ReactNode }) => {
  const statusClasses = {
    critical: 'text-status-critical',
    warning: 'text-orange-500',
    safe: 'text-status-safe',
  };
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-zinc-400 font-medium">{title}</span>
        <div className={statusClasses[status]}>{icon}</div>
      </div>
      <div className={`text-3xl font-bold ${statusClasses[status]}`}>{value}</div>
    </div>
  );
};

const AgentSidebar = ({ type }: { type: 'auditor' | 'defender' }) => {
  const config = {
    auditor: {
      name: "Auditor Agent",
      perspective: "Attacker Perspective",
      icon: <Bot className="w-5 h-5 text-red-400" />,
      gradient: "from-red-500/20 to-pink-500/20",
      logColor: "text-red-400",
      logs: [
        { time: "00:01", text: "Scanning contract structure..." },
        { time: "00:03", text: "DETECTED: Potential external call before state update on line 14.", highlight: true },
        { time: "00:04", text: "HYPOTHESIS: High likelihood of re-entrancy vulnerability.", highlight: true, bold: true },
      ]
    },
    defender: {
      name: "Defender Agent",
      perspective: "Guardian Perspective",
      icon: <Shield className="w-5 h-5 text-status-safe" />,
      gradient: "from-status-safe/20 to-emerald-500/20",
      logColor: "text-status-safe",
      logs: [
        { time: "00:02", text: "Analyzing function modifiers..." },
        { time: "00:04", text: "COUNTER-POINT: The 'nonReentrant' guard is missing.", highlight: true },
        { time: "00:05", text: "RECOMMENDATION: Implement Checks-Effects-Interactions pattern.", highlight: true, bold: true },
      ]
    }
  };
  const agent = config[type];
  return (
     <div className="lg:col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <div className={`flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800`}>
        <div className={`w-10 h-10 bg-gradient-to-br ${agent.gradient} rounded-lg flex items-center justify-center`}>
          {agent.icon}
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">{agent.name}</h3>
          <p className="text-xs text-zinc-500">{agent.perspective}</p>.
        </div>
      </div>
      <div className="space-y-4">
        {agent.logs.map((log, i) => (
          <div key={i} className="flex gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full ${agent.logColor}/10 flex items-center justify-center`}>
              {agent.icon}
            </div>
            <div className="flex-1">
              <div className="text-xs text-zinc-500 mb-1">{log.time}</div>
              <div className={`text-sm ${log.highlight ? agent.logColor : 'text-zinc-300'} ${log.bold ? 'font-medium' : ''}`}>
                {log.text}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CodeAnalysisPanel = () => (
  <div className="lg:col-span-6 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
    <div className="mb-4 pb-3 border-b border-zinc-800">
      <h3 className="font-semibold text-white text-sm">Contract Code Analysis</h3>
    </div>
    <div className="bg-[#0d1117] rounded-lg p-4 font-mono text-xs overflow-x-auto border border-zinc-800">
      {/* Mock code with highlighting */}
      <pre><code>
        <span className="text-zinc-500">1   pragma solidity ^0.8.0;</span>
        <span className="text-zinc-500">2</span>
        <span className="text-zinc-500">3   contract Vault {'{'}</span>
      </code></pre>
    </div>
  </div>
);
