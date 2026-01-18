'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  BarChart, Bell, Search, Users, X, ShieldCheck, AlertTriangle,
  Clock, Lock, Eye, EyeOff, Loader2, RefreshCw, Menu, LogOut
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ADMIN_PASSWORD = "nexsnkm1234";

interface KPIMetric {
  title: string;
  value: string;
  icon: string;
}

interface SystemHealthItem {
  name: string;
  status: string;
  healthy: boolean;
}

interface RecentAnalysis {
  id: string;
  repo: string;
  commit: string;
  status: string;
  timestamp: string;
  vuln_count: number;
  error?: string;
}

interface User {
  username: string;
  github_id: number;
  last_active: string | null;
  repo_count: number;
}

const AdminDashboard = () => {
  // Password protection state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data state
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetric[]>([
    { title: 'Total Users', value: '—', icon: 'users' },
    { title: 'Analyses (24h)', value: '—', icon: 'activity' },
    { title: 'Vulnerabilities Found', value: '—', icon: 'shield-alert' },
    { title: 'Monthly Token Spend', value: '—', icon: 'dollar-sign' },
  ]);
  const [systemHealth, setSystemHealth] = useState<SystemHealthItem[]>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([]);
  const [userList, setUserList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError('');
      // Store in session
      sessionStorage.setItem('admin_auth', 'true');
    } else {
      setPasswordError('Incorrect password');
    }
  };

  // Check session storage on mount
  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch admin stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/stats`);
      if (response.ok) {
        const data = await response.json();
        setKpiMetrics([
          { title: 'Total Users', value: data.total_users.toLocaleString(), icon: 'users' },
          { title: 'Analyses (24h)', value: data.analyses_24h.toLocaleString(), icon: 'activity' },
          { title: 'Vulnerabilities Found', value: data.vulnerabilities_found.toLocaleString(), icon: 'shield-alert' },
          { title: 'Monthly Token Spend', value: `$${data.monthly_token_spend}`, icon: 'dollar-sign' },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  // Fetch system health
  const fetchSystemHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/system-health`);
      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data.services);
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    }
  }, []);

  // Fetch recent analyses
  const fetchAnalyses = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/analyses?limit=10`);
      if (response.ok) {
        const data = await response.json();
        setRecentAnalyses(data.analyses);
      }
    } catch (error) {
      console.error('Failed to fetch analyses:', error);
    }
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/users?limit=10`);
      if (response.ok) {
        const data = await response.json();
        setUserList(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchSystemHealth(),
      fetchAnalyses(),
      fetchUsers(),
    ]);
    setLoading(false);
  }, [fetchStats, fetchSystemHealth, fetchAnalyses, fetchUsers]);

  // Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated, fetchAllData]);

  const openModal = (error: string) => {
    setModalError(error);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalError('');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
    setPassword('');
  };

  // Format last active time
  const formatLastActive = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Password protection screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <Lock className="w-12 h-12 text-indigo-500" />
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-2">Admin Dashboard</h1>
          <p className="text-zinc-500 text-center text-sm mb-6">Enter admin password to continue</p>

          <form onSubmit={handleLogin}>
            <div className="relative mb-4">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {passwordError && (
              <p className="text-red-400 text-sm mb-4">{passwordError}</p>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all"
            >
              Access Dashboard
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar for desktop and mobile */}
      <aside className={`fixed top-0 left-0 w-64 h-full bg-zinc-900/50 p-4 flex flex-col justify-between z-50 transform transition-transform duration-300 md:transform-none ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div>
          <div className="flex items-center ml-2 mb-4">
            <Image src="/logo-white.svg" alt="ProtectSUS Logo" width={16} height={16} />
            <h1 className="ml-2 text-xl font-medium">ProtectSUS Admin</h1>
          </div>
          <nav>
            <ul>
              <li className="mb-2">
                <a href="#" className="flex items-center p-2 text-zinc-300 bg-zinc-800/50 rounded-lg">
                  <BarChart className="h-4 w-4" />
                  <span className="ml-3 text-sm">Dashboard</span>
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className="flex items-center p-2 text-zinc-300 hover:bg-zinc-800/50 rounded-lg">
                  <Users className="h-4 w-4" />
                  <span className="ml-3 text-sm">Users</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center p-2 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            <span className="ml-3 text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:ml-64">
        {/* Mobile header */}
        <header className="md:hidden bg-zinc-900/50 border-b border-zinc-800 p-4 flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-zinc-400 hover:text-zinc-300 rounded-lg hover:bg-zinc-800/50"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full border border-blue-500/30 flex items-center justify-center">
            <span className="text-xs text-blue-400 font-medium">A</span>
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden md:flex items-center gap-4 mb-4 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search repositories, users, or analyses..."
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAllData}
              className="p-2 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Bell className="h-5 w-5 text-zinc-400 hover:text-zinc-300 cursor-pointer transition-colors" />
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full border border-blue-500/30 flex items-center justify-center">
              <span className="text-xs text-blue-400 font-medium">A</span>
            </div>
          </div>
        </header>

        {/* Main dashboard content */}
        <main className="p-4">
          {/* KPI Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {kpiMetrics.map((metric, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-indigo-500/10 p-4 rounded-lg border border-blue-500/20">
                <h3 className="text-zinc-400 text-xs font-medium mb-1">{metric.title}</h3>
                <p className="text-2xl font-medium text-blue-400">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : metric.value}
                </p>
              </div>
            ))}
          </div>

          {/* System Health */}
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">System Health</h3>
            <div className="flex overflow-x-auto gap-4 pb-2">
              {loading ? (
                <div className="flex items-center justify-center w-full py-8">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                </div>
              ) : systemHealth.length > 0 ? (
                systemHealth.map((system, index) => (
                  <div key={index} className="relative flex-shrink-0 w-48 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5">
                    <div className="flex items-center mb-2">
                      <div className="scale-75">
                        {system.healthy ? (
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <span className="ml-2 text-sm text-zinc-300">{system.name}</span>
                    </div>
                    <span className={`text-xs ${system.healthy ? 'text-emerald-400' : 'text-red-400'}`}>
                      {system.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-zinc-500 text-sm">Unable to fetch system health</p>
              )}
            </div>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Analyses */}
          <div className="lg:col-span-3 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
            <h3 className="text-lg font-medium mb-3">Recent Analyses</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-800">
                <thead className="bg-zinc-900/30">
                  <tr>
                    <th className="py-2 px-3 text-left text-xs text-zinc-500 uppercase tracking-wider">Repository</th>
                    <th className="py-2 px-3 text-left text-xs text-zinc-500 uppercase tracking-wider">Commit</th>
                    <th className="py-2 px-3 text-left text-xs text-zinc-500 uppercase tracking-wider">Status</th>
                    <th className="py-2 px-3 text-left text-xs text-zinc-500 uppercase tracking-wider">Vulns</th>
                    <th className="py-2 px-3 text-left text-xs text-zinc-500 uppercase tracking-wider">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="bg-zinc-900/30 divide-y divide-zinc-800">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center">
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : recentAnalyses.length > 0 ? (
                    recentAnalyses.map((analysis, index) => (
                      <tr key={index} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-3 whitespace-nowrap text-sm text-white">{analysis.repo}</td>
                        <td className="py-3 px-3 whitespace-nowrap text-xs text-zinc-400 font-mono">{analysis.commit}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-4 rounded-full ${analysis.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : analysis.status === 'PENDING' || analysis.status === 'IN_PROGRESS'
                                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}
                          >
                            {analysis.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-xs text-zinc-400">
                          {analysis.vuln_count > 0 ? (
                            <span className="text-red-400">{analysis.vuln_count}</span>
                          ) : (
                            <span className="text-emerald-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-xs text-zinc-400">{analysis.timestamp}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-500 text-sm">
                        No analyses found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* User List */}
          <div className="lg:col-span-2 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5">
            <h3 className="text-lg font-medium mb-3">Registered Users</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-800">
                <thead className="bg-zinc-900/30">
                  <tr>
                    <th className="py-2 px-3 text-left text-xs text-zinc-400 uppercase tracking-wider">Username</th>
                    <th className="py-2 px-3 text-left text-xs text-zinc-400 uppercase tracking-wider">Repos</th>
                    <th className="py-2 px-3 text-left text-xs text-zinc-400 uppercase tracking-wider">Last Active</th>
                  </tr>
                </thead>
                <tbody className="bg-zinc-900/30 divide-y divide-zinc-800">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center">
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : userList.length > 0 ? (
                    userList.map((user, index) => (
                      <tr key={index} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-2 px-3 whitespace-nowrap text-sm text-zinc-200">{user.username}</td>
                        <td className="py-2 px-3 whitespace-nowrap text-xs text-zinc-400">{user.repo_count}</td>
                        <td className="py-2 px-3 whitespace-nowrap text-xs text-zinc-400">
                          {formatLastActive(user.last_active)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-zinc-500 text-sm">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Token Consumption placeholder */}
          <div className="lg:col-span-1 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5">
            <h3 className="text-lg font-medium mb-3">API Usage</h3>
            <p className="text-zinc-500 text-sm">Token usage tracking coming soon...</p>
          </div>
        </div>
      </main>

      {/* Error Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900/80 p-4 rounded-lg border border-zinc-700 max-w-lg w-full bg-gradient-to-br from-red-500/5 via-transparent to-red-500/10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">Error Details</h3>
              <button onClick={closeModal} className="text-zinc-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-zinc-800/30 p-3 rounded-lg border border-red-500/20">
              <pre className="text-xs text-red-400 whitespace-pre-wrap font-mono">{modalError}</pre>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminDashboard;
