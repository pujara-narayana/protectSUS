"use client";

import { useState, useEffect } from "react";
import {
  LogOut,
  ChevronRight,
  Search,
  Loader2,
  GitCommit,
} from "lucide-react";
import { getRepos, getCommits } from "@/lib/github";

const CommitSelector = ({ onSelectCommit, onSignOut, session }: { onSelectCommit: (repo: any, commit: any) => void; onSignOut: () => void; session: any; }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [openRepoId, setOpenRepoId] = useState<number | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [commits, setCommits] = useState<{ [key: number]: any[] }>({});

  useEffect(() => {
    const fetchRepos = async () => {
      if (!session?.accessToken) return;
      setLoadingRepos(true);
      try {
        const reposData = await getRepos(session.accessToken);
        setRepos(reposData);
      } catch (error) {
        console.error("Failed to fetch repos:", error);
      } finally {
        setLoadingRepos(false);
      }
    };

    fetchRepos();
  }, [session?.accessToken]);

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRepoClick = async (repoId: number) => {
    if (openRepoId === repoId) {
      setOpenRepoId(null);
    } else {
      setLoadingCommits(true);
      setOpenRepoId(repoId);
      
      if (!commits[repoId] && session?.accessToken) {
        const repo = repos.find(r => r.id === repoId);
        if (repo) {
          try {
            const commitsData = await getCommits(session.accessToken, repo.owner.login, repo.name);
            setCommits(prev => ({ ...prev, [repoId]: commitsData }));
          } catch (error) {
            console.error("Failed to fetch commits:", error);
          }
        }
      }
      setLoadingCommits(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 py-12">
      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl text-white">Select a Commit to Audit</h1>
          <button onClick={onSignOut} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-zinc-800/50">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
        
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg pl-12 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="space-y-4">
          {loadingRepos ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="animate-spin w-8 h-8 text-white" />
            </div>
          ) : (
            filteredRepos.map(repo => (
              <div key={repo.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl transition-all duration-200">
                <button
                  onClick={() => handleRepoClick(repo.id)}
                  className="w-full text-left p-6 flex items-center justify-between group"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {repo.name}
                    </h3>
                    <p className="text-zinc-400 font-mono text-sm">{repo.owner.login}</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-zinc-500 transform transition-transform ${openRepoId === repo.id ? 'rotate-90' : ''}`} />
                </button>

                {openRepoId === repo.id && (
                  <div className="px-6 pb-6 border-t border-zinc-800">
                    {loadingCommits ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="animate-spin mr-2 text-white" />
                        <span className="text-zinc-400">Loading commits...</span>
                      </div>
                    ) : (
                      <ul className="space-y-3 pt-4">
                        {(commits[repo.id] || []).slice(0, 10).map(commit => (
                          <li key={commit.sha} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2">
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-3">
                                <GitCommit className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                                <code className="font-mono text-sm text-blue-400">{commit.sha.substring(0, 7)}</code>
                               </div>
                               <p className="text-zinc-300 mt-1 ml-7 text-sm line-clamp-2 break-words">{commit.commit.message}</p>
                            </div>
                             <button
                              onClick={() => onSelectCommit(repo, commit)}
                              className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap"
                            >
                              Audit
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommitSelector;
