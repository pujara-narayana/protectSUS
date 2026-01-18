'use client';

import { useState } from 'react';
import Image from 'next/image';
import { kpiMetrics, recentAnalyses, systemHealth, tokenConsumption, userList } from './mockData';
import { BarChart, Bell, Search, Users, X } from 'lucide-react';

const AdminDashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState('');

  const openModal = (error: string) => {
    setModalError(error);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalError('');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <aside className="fixed top-0 left-0 w-64 h-full bg-zinc-900/50 p-4 flex flex-col justify-between">
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
          <a href="/" className="flex items-center p-2 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </a>
        </div>
      </aside>

      <main className="ml-64 p-4">
        <header className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search repositories, users, or analyses..."
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50"
            />
          </div>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-zinc-400 hover:text-zinc-300 cursor-pointer transition-colors" />
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full border border-blue-500/30 flex items-center justify-center">
              <span className="text-xs text-blue-400 font-medium">A</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {kpiMetrics.map((metric, index) => (
            <div key={index} className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-indigo-500/10 p-4 rounded-lg border border-blue-500/20">
              <h3 className="text-zinc-400 text-xs font-medium mb-1">{metric.title}</h3>
              <p className="text-2xl font-medium text-blue-400">{metric.value}</p>
            </div>
          ))}
        </div>

        
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">System Health</h3>
          <div className="flex overflow-x-auto gap-4 pb-2">
            {systemHealth.map((system, index) => (
              <div key={index} className="relative flex-shrink-0 w-48 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5">
                <div className="flex items-center mb-2">
                  <div className="scale-75">{system.icon}</div>
                  <span className="ml-2 text-sm text-zinc-300">{system.name}</span>
                </div>
                <span
                  className={`text-xs ${system.status === 'Healthy' || system.status === '12/12 Online'
                      ? 'text-emerald-400'
                      : 'text-red-400'
                    }`}
                >
                  {system.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
            <h3 className="text-lg font-medium mb-3">Recent Analyses</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-800">
                <thead className="bg-zinc-900/30">
                  <tr>
                    <th className="py-2 px-3 text-left text-xs text-zinc-500 uppercase tracking-wider">Repository</th>
                    <th className="py-2 px-3 text-left text-xs text-zinc-500 uppercase tracking-wider">Commit</th>
                    <th className="py-2 px-3 text-left text-xs text-zinc-500 uppercase tracking-wider">Status</th>
                    <th className="py-2 px-3 text-left text-xs text-zinc-500 uppercase tracking-wider">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="bg-zinc-900/30 divide-y divide-zinc-800">
                  {recentAnalyses.map((analysis, index) => (
                    <tr key={index} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-3 whitespace-nowrap text-sm text-white">{analysis.repo}</td>
                      <td className="py-3 px-3 whitespace-nowrap text-xs text-zinc-400 font-mono">{analysis.commit}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-4 rounded-full ${analysis.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : analysis.status === 'PENDING'
                                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                        >
                          {analysis.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-xs text-zinc-400">{analysis.timestamp}</td>
                      {analysis.status === 'FAILED' && (
                        <td className="py-3 px-3 whitespace-nowrap">
                          <button
                            onClick={() => openModal(analysis.error || '')}
                            className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                          >
                            View Error
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-2 bg-zinc-900/50 p-4 -mt-2 rounded-lg border border-zinc-800 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5">
            <h3 className="text-lg font-medium mb-3">User & Cost Overview</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-800">
                <thead className="bg-zinc-900/30">
                  <tr>
                    <th className="py-2 px-3 text-left text-xs text-zinc-400 uppercase tracking-wider">Username</th>
                    <th className="py-2 px-3 text-left text-xs text-zinc-400 uppercase tracking-wider">Last Active</th>
                  </tr>
                </thead>
                <tbody className="bg-zinc-900/30 divide-y divide-zinc-800">
                  {userList.map((user, index) => (
                    <tr key={index} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-2 px-3 whitespace-nowrap text-sm text-zinc-200">{user.username}</td>
                      <td className="py-2 px-3 whitespace-nowrap text-xs text-zinc-400">{user.lastActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-1 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5">
            <h3 className="text-lg font-medium mb-3">Token Consumption</h3>
            <ul className="space-y-1">
              {tokenConsumption.map((item, index) => (
                <li key={index} className="flex items-center justify-between py-1.5 hover:bg-zinc-800/30 rounded px-2 transition-colors">
                  <span className="text-sm text-zinc-300">{item.audit}</span>
                  <span className="text-xs text-zinc-400">{item.cost}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
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
  );
};

export default AdminDashboard;
