'use client'

import { useState } from 'react'
import { 
  Github, 
  Users, 
  TrendingUp, 
  Code, 
  Bot, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle, 
  Info,
  ChevronRight,
  Sparkles
} from 'lucide-react'

interface Commit {
  hash: string
  message: string
  repo: string
  timestamp: string
}

const commits: Commit[] = [
  {
    hash: '0x7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
    message: 'feat: implement withdraw function',
    repo: 'kairo-defi-protocol',
    timestamp: '2 hours ago',
  },
  {
    hash: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b',
    message: 'fix: update access control modifiers',
    repo: 'nexus-lending-pool',
    timestamp: '5 hours ago',
  },
  {
    hash: '0x9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
    message: 'refactor: optimize gas usage in transfer logic',
    repo: 'quantum-swap-v2',
    timestamp: '1 day ago',
  },
  {
    hash: '0x2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
    message: 'feat: add emergency pause mechanism',
    repo: 'stellar-bridge-contract',
    timestamp: '2 days ago',
  },
  {
    hash: '0x5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f',
    message: 'fix: resolve integer overflow in calculation',
    repo: 'crypto-vault-manager',
    timestamp: '3 days ago',
  },
]

type ViewState = 'landing' | 'commits' | 'dashboard'

export default function Home() {
  const [viewState, setViewState] = useState<ViewState>('landing')
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null)

  const handleConnectGitHub = () => {
    setViewState('commits')
  }

  const handleSelectCommit = (commit: Commit) => {
    setSelectedCommit(commit)
    setViewState('dashboard')
  }

  // Step 1: Landing Page
  if (viewState === 'landing') {
    return (
      <div className="min-h-screen bg-zinc-950">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-mesh opacity-50"></div>
          <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-24 sm:py-32">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
                  Secure Your Smart Contracts with{' '}
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Agentic Intelligence
                  </span>
                </h1>
                <p className="text-xl text-zinc-400 mb-8 leading-relaxed">
                  CodeVault uses multi-agent debate and market-weighted risk analysis to catch vulnerabilities before they deploy.
                </p>
                <button
                  onClick={handleConnectGitHub}
                  className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                >
                  <Github className="w-5 h-5" />
                  Connect with GitHub to Start Audit
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              <div className="hidden lg:block relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-2xl blur-3xl"></div>
                <div className="relative bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-status-safe"></div>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 w-3/4"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-status-warning"></div>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 w-1/2"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-status-critical"></div>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-500 to-pink-500 w-1/4"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-24">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 hover:border-zinc-700 transition-colors">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-lg flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Multi-Agent Debate</h3>
              <p className="text-zinc-400 leading-relaxed">
                Adversarial agents analyze your code from attacker and defender perspectives.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 hover:border-zinc-700 transition-colors">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-lg flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Market-Weighted Risk</h3>
              <p className="text-zinc-400 leading-relaxed">
                Risk scores are adjusted in real-time based on Polymarket sentiment.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 hover:border-zinc-700 transition-colors">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-lg flex items-center justify-center mb-6">
                <Code className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Instant IDE Feedback</h3>
              <p className="text-zinc-400 leading-relaxed">
                Integrates directly into your workflow for continuous security.
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16 border-t border-zinc-800">
          <div className="text-center">
            <p className="text-lg text-zinc-400">
              <span className="text-white font-semibold">Free for Hackathon Use.</span> Enterprise plans available soon.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Commit Selection
  if (viewState === 'commits') {
    return (
      <div className="min-h-screen bg-zinc-950 py-12">
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <h1 className="text-3xl font-bold text-white mb-8">Select a Commit to Audit</h1>
          
          <div className="space-y-4">
            {commits.map((commit, index) => (
              <div
                key={index}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all duration-200 flex items-center justify-between group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <code className="font-mono text-sm text-blue-400 bg-zinc-800 px-3 py-1.5 rounded-md">
                      {commit.hash.slice(0, 20)}...
                    </code>
                    <span className="text-zinc-500 text-sm">{commit.timestamp}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1.5 group-hover:text-blue-400 transition-colors">
                    {commit.message}
                  </h3>
                  <p className="text-zinc-400 font-mono text-sm">{commit.repo}</p>
                </div>
                
                <button
                  onClick={() => handleSelectCommit(commit)}
                  className="ml-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                >
                  Audit Commit
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Dashboard
  if (viewState === 'dashboard') {
    if (!selectedCommit) return null

    return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{selectedCommit.repo}</h2>
              <code className="text-sm text-zinc-400 font-mono">{selectedCommit.hash.slice(0, 40)}...</code>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-status-safe/10 border border-status-safe/20 rounded-lg">
              <div className="w-2 h-2 bg-status-safe rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-status-safe">Scan Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400 font-medium">Overall Risk</span>
              <AlertTriangle className="w-5 h-5 text-status-critical" />
            </div>
            <div className="text-3xl font-bold text-status-critical">88/100</div>
            <div className="mt-2 text-xs text-zinc-500">Critical</div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400 font-medium">Critical Issues</span>
              <AlertCircle className="w-5 h-5 text-status-critical" />
            </div>
            <div className="text-3xl font-bold text-status-critical">2</div>
            <div className="mt-2 text-xs text-zinc-500">Requires immediate attention</div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400 font-medium">High Severity</span>
              <Info className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-orange-500">4</div>
            <div className="mt-2 text-xs text-zinc-500">Should be addressed</div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400 font-medium">Total Findings</span>
              <CheckCircle className="w-5 h-5 text-status-safe" />
            </div>
            <div className="text-3xl font-bold text-status-safe">15</div>
            <div className="mt-2 text-xs text-zinc-500">Issues detected</div>
          </div>
        </div>

        {/* Debate Layout */}
        <div className="grid lg:grid-cols-12 gap-6 mb-8">
          {/* Left Sidebar - Auditor Agent */}
          <div className="lg:col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Auditor Agent</h3>
                <p className="text-xs text-zinc-500">Attacker Perspective</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-zinc-500 mb-1">00:01</div>
                  <div className="text-sm text-zinc-300">Scanning contract structure...</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-zinc-500 mb-1">00:03</div>
                  <div className="text-sm text-zinc-300">
                    <span className="text-red-400 font-medium">DETECTED:</span> Potential external call before state update on line 14.
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-zinc-500 mb-1">00:04</div>
                  <div className="text-sm text-red-400 font-medium">
                    HYPOTHESIS: High likelihood of re-entrancy vulnerability.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center - Code Editor */}
          <div className="lg:col-span-6 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="mb-4 pb-3 border-b border-zinc-800">
              <h3 className="font-semibold text-white text-sm">Contract Code Analysis</h3>
            </div>
            <div className="bg-[#0d1117] rounded-lg p-4 font-mono text-xs overflow-x-auto border border-zinc-800">
              <div className="space-y-0.5">
                <div className="text-zinc-500">1   pragma solidity ^0.8.0;</div>
                <div className="text-zinc-500">2   </div>
                <div className="text-zinc-500">3   contract Vault {'{'}</div>
                <div className="text-zinc-500">4       mapping(address =&gt; uint256) public balances;</div>
                <div className="text-zinc-500">5       </div>
                <div className="text-zinc-500">6       function deposit() external payable {'{'}</div>
                <div className="text-zinc-500">7           balances[msg.sender] += msg.value;</div>
                <div className="text-zinc-500">8       {'}'}</div>
                <div className="text-zinc-500">9       </div>
                <div className="text-zinc-500">10      function withdraw(uint256 amount) external {'{'}</div>
                <div className="text-zinc-500">11          require(balances[msg.sender] &gt;= amount, "Insufficient balance");</div>
                <div className="bg-red-500/20 text-red-300 px-2 py-1 rounded -mx-2">12          (bool success, ) = msg.sender.call{'{value: amount}'}("");</div>
                <div className="bg-red-500/20 text-red-300 px-2 py-1 rounded -mx-2">13          require(success, "Transfer failed");</div>
                <div className="bg-red-500/20 text-red-300 px-2 py-1 rounded -mx-2">14          balances[msg.sender] -= amount;</div>
                <div className="text-zinc-500">15      {'}'}</div>
                <div className="text-zinc-500">16      </div>
                <div className="text-zinc-500">17      function getBalance() external view returns (uint256) {'{'}</div>
                <div className="text-zinc-500">18          return balances[msg.sender];</div>
                <div className="text-zinc-500">19      {'}'}</div>
                <div className="text-zinc-500">20  {'}'}</div>
              </div>
            </div>
            <div className="mt-4 bg-red-500/10 border-l-4 border-red-500 rounded-r-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-red-400 mb-1">
                    Vulnerability Detected: Lines 12-15
                  </div>
                  <div className="text-sm text-zinc-400">
                    External call executed before state update - Classic re-entrancy pattern
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Defender Agent */}
          <div className="lg:col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
              <div className="w-10 h-10 bg-gradient-to-br from-status-safe/20 to-emerald-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-status-safe" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Defender Agent</h3>
                <p className="text-xs text-zinc-500">Guardian Perspective</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-status-safe/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-status-safe" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-zinc-500 mb-1">00:02</div>
                  <div className="text-sm text-zinc-300">Analyzing function modifiers...</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-status-safe/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-status-safe" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-zinc-500 mb-1">00:04</div>
                  <div className="text-sm text-zinc-300">
                    <span className="text-status-safe font-medium">COUNTER-POINT:</span> The 'nonReentrant' guard is missing.
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-status-safe/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-status-safe" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-zinc-500 mb-1">00:05</div>
                  <div className="text-sm text-red-400 font-medium">
                    DEFENSE FAILED: Agrees with Auditor assessment on line 14.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verdict Panel */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-semibold text-white">Final Verdict</h3>
          </div>
          <div className="bg-zinc-950 rounded-lg p-6 border border-zinc-800">
            <div className="mb-4">
              <span className="text-status-critical font-semibold">CONCLUSION:</span>
              <span className="text-white ml-2">
                Critical vulnerability confirmed. Agents concur on re-entrancy risk. Market sentiment weighting elevated priority to{' '}
                <span className="text-status-critical font-semibold">BLOCKING</span>.
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
              <div>
                <span className="text-sm text-zinc-500">Vulnerability Type:</span>
                <span className="text-white ml-2 font-medium">Re-entrancy Attack</span>
              </div>
              <div>
                <span className="text-sm text-zinc-500">Confidence:</span>
                <span className="text-white ml-2 font-medium">98.7%</span>
              </div>
              <div>
                <span className="text-sm text-zinc-500">Affected Lines:</span>
                <span className="text-white ml-2 font-medium">12-15</span>
              </div>
              <div>
                <span className="text-sm text-zinc-500">Recommendation:</span>
                <span className="text-status-critical ml-2 font-semibold">IMMEDIATE FIX REQUIRED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    )
  }

  return null
}
