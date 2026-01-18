"use client";

import {
    Network,
    FileCode,
    AlertTriangle,
    Package,
    Activity,
    GitBranch,
    Wifi,
    WifiOff,
} from "lucide-react";

interface GraphStatsProps {
    stats: {
        total_nodes?: number;
        total_edges?: number;
        repositories?: number;
        files?: number;
        vulnerabilities?: number;
        dependencies?: number;
        analyses?: number;
    };
    isConnected?: boolean;
}

export default function GraphStats({ stats, isConnected = true }: GraphStatsProps) {
    const statItems = [
        {
            icon: <Network className="w-4 h-4" />,
            label: "Total Nodes",
            value: stats.total_nodes || 0,
            color: "indigo",
        },
        {
            icon: <GitBranch className="w-4 h-4" />,
            label: "Repositories",
            value: stats.repositories || 0,
            color: "purple",
        },
        {
            icon: <FileCode className="w-4 h-4" />,
            label: "Files",
            value: stats.files || 0,
            color: "blue",
        },
        {
            icon: <AlertTriangle className="w-4 h-4" />,
            label: "Vulnerabilities",
            value: stats.vulnerabilities || 0,
            color: "red",
        },
        {
            icon: <Package className="w-4 h-4" />,
            label: "Dependencies",
            value: stats.dependencies || 0,
            color: "amber",
        },
        {
            icon: <Activity className="w-4 h-4" />,
            label: "Analyses",
            value: stats.analyses || 0,
            color: "emerald",
        },
    ];

    const colorClasses: Record<string, string> = {
        indigo: "bg-indigo-500/10 text-indigo-400",
        purple: "bg-purple-500/10 text-purple-400",
        blue: "bg-blue-500/10 text-blue-400",
        red: "bg-red-500/10 text-red-400",
        amber: "bg-amber-500/10 text-amber-400",
        emerald: "bg-emerald-500/10 text-emerald-400",
    };

    return (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Graph Statistics</h3>
                <div className="flex items-center gap-2 text-xs">
                    {isConnected ? (
                        <>
                            <Wifi className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Live</span>
                        </>
                    ) : (
                        <>
                            <WifiOff className="w-3 h-3 text-zinc-500" />
                            <span className="text-zinc-500">Offline</span>
                        </>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {statItems.map((item) => (
                    <div
                        key={item.label}
                        className={`rounded-lg p-3 ${colorClasses[item.color]}`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            {item.icon}
                            <span className="text-xs uppercase tracking-wide opacity-80">
                                {item.label}
                            </span>
                        </div>
                        <p className="text-xl font-bold">{item.value.toLocaleString()}</p>
                    </div>
                ))}
            </div>

            {/* Edge Count */}
            {stats.total_edges !== undefined && (
                <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-500 flex justify-between">
                    <span>Total Edges: {stats.total_edges?.toLocaleString()}</span>
                    <span>
                        Avg Edges/Node:{" "}
                        {stats.total_nodes && stats.total_nodes > 0
                            ? (stats.total_edges / stats.total_nodes).toFixed(1)
                            : "0"}
                    </span>
                </div>
            )}
        </div>
    );
}
