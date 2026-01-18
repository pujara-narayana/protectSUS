"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import {
    Network,
    LogOut,
    RefreshCw,
    AlertCircle,
} from "lucide-react";

import InteractiveGraph from "@/features/graphs/InteractiveGraph";
import RepoGraphList from "@/features/graphs/RepoGraphList";
import GraphStats from "@/features/graphs/GraphStats";
import TerminalSpinner from "@/features/landing/TerminalSpinner";

interface GraphNode {
    id: string;
    type: "repository" | "file" | "vulnerability" | "dependency" | "analysis";
    label: string;
    severity?: string;
    risk_level?: string;
    data?: Record<string, any>;
}

interface GraphEdge {
    source: string;
    target: string;
    type: string;
}

interface RepoWithGraphStatus {
    full_name: string;
    name: string;
    owner: string;
    is_indexed: boolean;
    node_count: number;
    stats: Record<string, any>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function GraphsPage() {
    const { status, data: session } = useSession();
    const [repositories, setRepositories] = useState<RepoWithGraphStatus[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [edges, setEdges] = useState<GraphEdge[]>([]);
    const [stats, setStats] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [graphLoading, setGraphLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSSEConnected, setIsSSEConnected] = useState(false);
    const [viewMode, setViewMode] = useState<"single" | "all">("single");

    const userId = (session?.user as any)?.id || "";

    // Fetch user repositories with graph status
    const fetchRepositories = useCallback(async () => {
        if (!userId) return;

        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/v1/graphs/user?user_id=${userId}`);

            if (!response.ok) {
                throw new Error("Failed to fetch repositories");
            }

            const data = await response.json();
            setRepositories(data.repositories || []);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // Fetch graph for a single repository
    const fetchRepoGraph = useCallback(async (repoFullName: string) => {
        if (!userId) return;

        try {
            setGraphLoading(true);
            const [owner, repo] = repoFullName.split("/");
            const response = await fetch(
                `${API_URL}/api/v1/graphs/${owner}/${repo}?user_id=${userId}`
            );

            if (!response.ok) {
                throw new Error("Failed to fetch graph data");
            }

            const data = await response.json();
            setNodes(data.nodes || []);
            setEdges(data.edges || []);
            setStats(data.stats || {});
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setGraphLoading(false);
        }
    }, [userId]);

    // Fetch combined graph for all repositories
    const fetchAllReposGraph = useCallback(async () => {
        if (!userId) return;

        try {
            setGraphLoading(true);
            const response = await fetch(
                `${API_URL}/api/v1/graphs/all?user_id=${userId}&limit_per_repo=30`
            );

            if (!response.ok) {
                throw new Error("Failed to fetch combined graph");
            }

            const data = await response.json();
            setNodes(data.nodes || []);
            setEdges(data.edges || []);
            setStats(data.stats || {});
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setGraphLoading(false);
        }
    }, [userId]);

    // Trigger graph indexing for a repository
    const handleTriggerIndex = async (repoFullName: string) => {
        if (!userId) return;

        const [owner, repo] = repoFullName.split("/");
        const response = await fetch(
            `${API_URL}/api/v1/graphs/${owner}/${repo}/index?user_id=${userId}`,
            { method: "POST" }
        );

        if (!response.ok) {
            throw new Error("Failed to trigger indexing");
        }

        // Refresh repositories list
        await fetchRepositories();
    };

    // Handle repository selection
    const handleSelectRepo = (repoFullName: string) => {
        setSelectedRepo(repoFullName);
        setViewMode("single");
        fetchRepoGraph(repoFullName);
    };

    // Handle view mode change
    const handleViewAllRepos = () => {
        setViewMode("all");
        setSelectedRepo(null);
        fetchAllReposGraph();
    };

    // Set up SSE connection
    useEffect(() => {
        if (!userId) return;

        const eventSource = new EventSource(
            `${API_URL}/api/v1/graphs/events?user_id=${userId}`
        );

        eventSource.onopen = () => {
            setIsSSEConnected(true);
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "indexed") {
                    // Refresh on graph update
                    fetchRepositories();
                    if (selectedRepo === data.repository) {
                        fetchRepoGraph(data.repository);
                    }
                }
            } catch {
                // Heartbeat or invalid JSON
            }
        };

        eventSource.onerror = () => {
            setIsSSEConnected(false);
        };

        return () => {
            eventSource.close();
        };
    }, [userId, selectedRepo, fetchRepositories, fetchRepoGraph]);

    // Initial fetch
    useEffect(() => {
        fetchRepositories();
    }, [fetchRepositories]);

    const handleSignOut = () => {
        signOut({ callbackUrl: "https://www.protectsus.tech/" });
    };

    if (status === "loading") {
        return <TerminalSpinner />;
    }

    if (status === "unauthenticated") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            {/* Header */}
            <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="max-w-[1800px] mx-auto px-4 sm:px-6 md:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Network className="w-6 h-6 text-indigo-500" />
                            <div>
                                <h1 className="text-lg font-semibold text-white">
                                    Knowledge Graphs
                                </h1>
                                <p className="text-xs text-zinc-500">
                                    Interactive visualization of your codebase
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* View mode toggle */}
                            <div className="flex bg-zinc-800 rounded-lg p-1">
                                <button
                                    onClick={() => selectedRepo && handleSelectRepo(selectedRepo)}
                                    className={`px-3 py-1.5 rounded text-sm transition-colors ${viewMode === "single"
                                            ? "bg-indigo-600 text-white"
                                            : "text-zinc-400 hover:text-white"
                                        }`}
                                >
                                    Single Repo
                                </button>
                                <button
                                    onClick={handleViewAllRepos}
                                    className={`px-3 py-1.5 rounded text-sm transition-colors ${viewMode === "all"
                                            ? "bg-indigo-600 text-white"
                                            : "text-zinc-400 hover:text-white"
                                        }`}
                                >
                                    All Repos
                                </button>
                            </div>

                            <a
                                href="/dashboard"
                                className="text-zinc-400 hover:text-white text-sm transition-colors"
                            >
                                Dashboard
                            </a>

                            <button
                                onClick={handleSignOut}
                                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Bar */}
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 md:px-8 py-4">
                <GraphStats stats={stats} isConnected={isSSEConnected} />
            </div>

            {/* Main Content */}
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 md:px-8 pb-8">
                {error && (
                    <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <p className="text-red-400">{error}</p>
                        <button
                            onClick={() => {
                                setError(null);
                                fetchRepositories();
                            }}
                            className="ml-auto text-sm text-red-400 hover:text-red-300"
                        >
                            Retry
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Repository List Sidebar */}
                    <div className="lg:col-span-1 h-[600px]">
                        <RepoGraphList
                            repositories={repositories}
                            selectedRepo={selectedRepo}
                            onSelectRepo={handleSelectRepo}
                            onTriggerIndex={handleTriggerIndex}
                            loading={loading}
                        />
                    </div>

                    {/* Graph Visualization */}
                    <div className="lg:col-span-3">
                        <InteractiveGraph
                            nodes={nodes}
                            edges={edges}
                            onRefresh={() => {
                                if (viewMode === "all") {
                                    fetchAllReposGraph();
                                } else if (selectedRepo) {
                                    fetchRepoGraph(selectedRepo);
                                }
                            }}
                            loading={graphLoading}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
