"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
    Network,
    AlertTriangle,
    FileCode,
    Package,
    Shield,
    Activity,
    RefreshCw,
} from "lucide-react";

// Types
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

interface GraphStats {
    total_nodes: number;
    total_edges: number;
    files: number;
    vulnerabilities: number;
    dependencies: number;
    analyses: number;
}

interface KnowledgeGraphViewProps {
    repoFullName: string;
}

// Node color mapping
const nodeColors: Record<string, string> = {
    repository: "#6366f1", // indigo
    file: "#3b82f6", // blue
    vulnerability: "#ef4444", // red
    dependency: "#f59e0b", // amber
    analysis: "#10b981", // emerald
};

// Node icon mapping
const NodeIcon = ({ type }: { type: string }) => {
    switch (type) {
        case "repository":
            return <Network className="w-4 h-4" />;
        case "file":
            return <FileCode className="w-4 h-4" />;
        case "vulnerability":
            return <AlertTriangle className="w-4 h-4" />;
        case "dependency":
            return <Package className="w-4 h-4" />;
        case "analysis":
            return <Activity className="w-4 h-4" />;
        default:
            return <Shield className="w-4 h-4" />;
    }
};

export default function KnowledgeGraphView({ repoFullName }: KnowledgeGraphViewProps) {
    const { data: session } = useSession();
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [edges, setEdges] = useState<GraphEdge[]>([]);
    const [stats, setStats] = useState<GraphStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [indexing, setIndexing] = useState(false);
    const [indexingMessage, setIndexingMessage] = useState<string | null>(null);

    const triggerIndexing = useCallback(async () => {
        if (!repoFullName) return;

        setIndexing(true);
        setIndexingMessage("Starting knowledge graph indexing...");
        setError(null);

        try {
            const [owner, repo] = repoFullName.split("/");

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/kg/${owner}/${repo}/index`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to trigger knowledge graph indexing");
            }

            const data = await response.json();
            setIndexingMessage(data.message || "Indexing started! This may take a few minutes.");

            // Poll for completion
            setTimeout(() => {
                fetchGraphData();
                setIndexing(false);
                setIndexingMessage(null);
            }, 10000); // Check after 10 seconds
        } catch (err: any) {
            setError(err.message || "Failed to start indexing");
            setIndexing(false);
            setIndexingMessage(null);
        }
    }, [repoFullName]);

    const fetchGraphData = useCallback(async () => {
        if (!repoFullName) return;

        setLoading(true);
        setError(null);

        try {
            const [owner, repo] = repoFullName.split("/");
            const userId = (session?.user as any)?.id || "";

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/kg/${owner}/${repo}?user_id=${userId}`
            );

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error("You do not have access to this repository's knowledge graph");
                }
                throw new Error("Failed to fetch knowledge graph data");
            }

            const data = await response.json();
            setNodes(data.nodes || []);
            setEdges(data.edges || []);
            setStats(data.stats || null);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    }, [repoFullName, session]);

    useEffect(() => {
        fetchGraphData();
    }, [fetchGraphData]);

    // Render loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-gray-400">Loading knowledge graph...</p>
                </div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
                <div className="flex flex-col items-center gap-4 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                    <p className="text-red-400">{error}</p>
                    <button
                        onClick={fetchGraphData}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Render empty state or indexing state
    if (nodes.length === 0) {
        return (
            <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
                <div className="flex flex-col items-center gap-4 text-center max-w-md">
                    {indexing ? (
                        <>
                            <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
                            <p className="text-indigo-400 font-medium">Generating Knowledge Graph...</p>
                            <p className="text-gray-500 text-sm">{indexingMessage}</p>
                        </>
                    ) : (
                        <>
                            <Network className="w-12 h-12 text-gray-600" />
                            <p className="text-gray-400">No knowledge graph data available yet.</p>
                            <p className="text-gray-500 text-sm">
                                Generate a knowledge graph to visualize your codebase structure, dependencies, and security findings.
                            </p>
                            <button
                                onClick={triggerIndexing}
                                className="mt-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Generate Knowledge Graph
                            </button>
                            <button
                                onClick={fetchGraphData}
                                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                Refresh
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 rounded-lg p-6">
            {/* Header with stats */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Network className="w-5 h-5 text-indigo-500" />
                    Knowledge Graph
                </h3>
                <button
                    onClick={fetchGraphData}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Stats bar */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <StatCard
                        icon={<Network className="w-4 h-4" />}
                        label="Total Nodes"
                        value={stats.total_nodes}
                        color="indigo"
                    />
                    <StatCard
                        icon={<FileCode className="w-4 h-4" />}
                        label="Files"
                        value={stats.files}
                        color="blue"
                    />
                    <StatCard
                        icon={<AlertTriangle className="w-4 h-4" />}
                        label="Vulnerabilities"
                        value={stats.vulnerabilities}
                        color="red"
                    />
                    <StatCard
                        icon={<Package className="w-4 h-4" />}
                        label="Dependencies"
                        value={stats.dependencies}
                        color="amber"
                    />
                    <StatCard
                        icon={<Activity className="w-4 h-4" />}
                        label="Analyses"
                        value={stats.analyses}
                        color="emerald"
                    />
                </div>
            )}

            {/* Graph visualization - simplified list view */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Node list by type */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                        Nodes by Type
                    </h4>
                    {["repository", "file", "vulnerability", "dependency", "analysis"].map((type) => {
                        const typeNodes = nodes.filter((n) => n.type === type);
                        if (typeNodes.length === 0) return null;

                        return (
                            <div key={type} className="bg-gray-800 rounded-lg p-4">
                                <div
                                    className="flex items-center gap-2 mb-3"
                                    style={{ color: nodeColors[type] }}
                                >
                                    <NodeIcon type={type} />
                                    <span className="font-medium capitalize">{type}s</span>
                                    <span className="text-gray-500 text-sm">({typeNodes.length})</span>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {typeNodes.slice(0, 10).map((node) => (
                                        <div
                                            key={node.id}
                                            onClick={() => setSelectedNode(node)}
                                            className={`p-2 rounded cursor-pointer transition-colors ${selectedNode?.id === node.id
                                                ? "bg-gray-700"
                                                : "hover:bg-gray-700/50"
                                                }`}
                                        >
                                            <p className="text-sm text-white truncate">{node.label}</p>
                                            {node.severity && (
                                                <span
                                                    className={`text-xs px-2 py-0.5 rounded ${node.severity === "critical"
                                                        ? "bg-red-500/20 text-red-400"
                                                        : node.severity === "high"
                                                            ? "bg-orange-500/20 text-orange-400"
                                                            : node.severity === "medium"
                                                                ? "bg-yellow-500/20 text-yellow-400"
                                                                : "bg-gray-500/20 text-gray-400"
                                                        }`}
                                                >
                                                    {node.severity}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    {typeNodes.length > 10 && (
                                        <p className="text-xs text-gray-500">
                                            +{typeNodes.length - 10} more
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Selected node details */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                        Node Details
                    </h4>
                    {selectedNode ? (
                        <div className="bg-gray-800 rounded-lg p-4">
                            <div
                                className="flex items-center gap-2 mb-4"
                                style={{ color: nodeColors[selectedNode.type] }}
                            >
                                <NodeIcon type={selectedNode.type} />
                                <span className="font-medium capitalize">{selectedNode.type}</span>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-4">
                                {selectedNode.label}
                            </h3>
                            {selectedNode.data && (
                                <div className="space-y-2">
                                    {Object.entries(selectedNode.data).map(([key, value]) => (
                                        <div key={key} className="flex justify-between text-sm">
                                            <span className="text-gray-400 capitalize">
                                                {key.replace(/_/g, " ")}
                                            </span>
                                            <span className="text-white truncate max-w-[200px]">
                                                {typeof value === "object"
                                                    ? JSON.stringify(value)
                                                    : String(value)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* Connected edges */}
                            <div className="mt-4 pt-4 border-t border-gray-700">
                                <p className="text-sm text-gray-400 mb-2">Connections</p>
                                <div className="space-y-1">
                                    {edges
                                        .filter(
                                            (e) =>
                                                e.source === selectedNode.id ||
                                                e.target === selectedNode.id
                                        )
                                        .slice(0, 5)
                                        .map((edge, idx) => {
                                            const isSource = edge.source === selectedNode.id;
                                            const connectedId = isSource ? edge.target : edge.source;
                                            const connectedNode = nodes.find((n) => n.id === connectedId);
                                            return (
                                                <div
                                                    key={idx}
                                                    className="text-xs text-gray-500 flex items-center gap-2"
                                                >
                                                    <span className="text-indigo-400">{edge.type}</span>
                                                    <span>→</span>
                                                    <span className="text-white">
                                                        {connectedNode?.label || connectedId}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-500">
                            <p>Select a node to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Stat card component
function StatCard({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
}) {
    const colorClasses: Record<string, string> = {
        indigo: "bg-indigo-500/10 text-indigo-400",
        blue: "bg-blue-500/10 text-blue-400",
        red: "bg-red-500/10 text-red-400",
        amber: "bg-amber-500/10 text-amber-400",
        emerald: "bg-emerald-500/10 text-emerald-400",
    };

    return (
        <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
            <div className="flex items-center gap-2 mb-1">
                {icon}
                <span className="text-xs uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    );
}
