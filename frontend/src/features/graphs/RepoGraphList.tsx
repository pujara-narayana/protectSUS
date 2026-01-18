"use client";

import { useState } from "react";
import {
    Search,
    ChevronRight,
    CheckCircle,
    Clock,
    AlertCircle,
    GitBranch,
    Loader2,
    RefreshCw,
} from "lucide-react";

interface RepoWithGraphStatus {
    full_name: string;
    name: string;
    owner: string;
    is_indexed: boolean;
    node_count: number;
    stats: {
        files?: number;
        vulnerabilities?: number;
        dependencies?: number;
        analyses?: number;
    };
}

interface RepoGraphListProps {
    repositories: RepoWithGraphStatus[];
    selectedRepo: string | null;
    onSelectRepo: (repoFullName: string) => void;
    onTriggerIndex: (repoFullName: string) => Promise<void>;
    loading?: boolean;
}

export default function RepoGraphList({
    repositories,
    selectedRepo,
    onSelectRepo,
    onTriggerIndex,
    loading = false,
}: RepoGraphListProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [indexingRepos, setIndexingRepos] = useState<Set<string>>(new Set());

    const filteredRepos = repositories.filter(
        (repo) =>
            repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            repo.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleTriggerIndex = async (e: React.MouseEvent, repoFullName: string) => {
        e.stopPropagation();
        setIndexingRepos((prev) => new Set(prev).add(repoFullName));
        try {
            await onTriggerIndex(repoFullName);
        } finally {
            setIndexingRepos((prev) => {
                const next = new Set(prev);
                next.delete(repoFullName);
                return next;
            });
        }
    };

    const getStatusIcon = (repo: RepoWithGraphStatus) => {
        if (indexingRepos.has(repo.full_name)) {
            return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
        }
        if (repo.is_indexed) {
            return <CheckCircle className="w-4 h-4 text-emerald-400" />;
        }
        return <Clock className="w-4 h-4 text-zinc-500" />;
    };

    const getStatusText = (repo: RepoWithGraphStatus) => {
        if (indexingRepos.has(repo.full_name)) {
            return "Indexing...";
        }
        if (repo.is_indexed) {
            return `${repo.node_count} nodes`;
        }
        return "Not indexed";
    };

    return (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-indigo-400" />
                    Repositories
                </h3>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search repos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Repository List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    </div>
                ) : filteredRepos.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-sm">
                        {searchTerm ? "No matching repositories" : "No repositories found"}
                    </div>
                ) : (
                    <ul className="divide-y divide-zinc-800">
                        {filteredRepos.map((repo) => (
                            <li
                                key={repo.full_name}
                                onClick={() => onSelectRepo(repo.full_name)}
                                className={`p-3 cursor-pointer transition-colors ${selectedRepo === repo.full_name
                                        ? "bg-indigo-600/20 border-l-2 border-indigo-500"
                                        : "hover:bg-zinc-800/50"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium truncate">{repo.name}</p>
                                        <p className="text-zinc-500 text-xs truncate">{repo.owner}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                                </div>

                                {/* Status row */}
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2 text-xs">
                                        {getStatusIcon(repo)}
                                        <span className="text-zinc-400">{getStatusText(repo)}</span>
                                    </div>

                                    {!repo.is_indexed && !indexingRepos.has(repo.full_name) && (
                                        <button
                                            onClick={(e) => handleTriggerIndex(e, repo.full_name)}
                                            className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-white transition-colors"
                                        >
                                            Index Now
                                        </button>
                                    )}
                                </div>

                                {/* Stats */}
                                {repo.is_indexed && repo.stats && (
                                    <div className="flex gap-3 mt-2 text-xs text-zinc-500">
                                        {repo.stats.files !== undefined && (
                                            <span>{repo.stats.files} files</span>
                                        )}
                                        {repo.stats.vulnerabilities !== undefined && repo.stats.vulnerabilities > 0 && (
                                            <span className="text-red-400">
                                                {repo.stats.vulnerabilities} vulns
                                            </span>
                                        )}
                                        {repo.stats.dependencies !== undefined && repo.stats.dependencies > 0 && (
                                            <span>{repo.stats.dependencies} deps</span>
                                        )}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Summary Footer */}
            <div className="p-3 border-t border-zinc-800 text-xs text-zinc-500">
                {repositories.length} repos •{" "}
                {repositories.filter((r) => r.is_indexed).length} indexed
            </div>
        </div>
    );
}
