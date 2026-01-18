"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import {
    RefreshCw,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Download,
    Info,
} from "lucide-react";

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

interface InteractiveGraphProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
    onNodeClick?: (node: GraphNode) => void;
    onRefresh?: () => void;
    loading?: boolean;
}

// Color scheme for different node types
const nodeColors: Record<string, { background: string; border: string; highlight: string }> = {
    repository: { background: "#6366f1", border: "#4f46e5", highlight: "#818cf8" },
    file: { background: "#3b82f6", border: "#2563eb", highlight: "#60a5fa" },
    vulnerability: { background: "#ef4444", border: "#dc2626", highlight: "#f87171" },
    dependency: { background: "#f59e0b", border: "#d97706", highlight: "#fbbf24" },
    analysis: { background: "#10b981", border: "#059669", highlight: "#34d399" },
};

// Node shapes for different types
const nodeShapes: Record<string, string> = {
    repository: "hexagon",
    file: "box",
    vulnerability: "triangle",
    dependency: "diamond",
    analysis: "ellipse",
};

// Severity colors for vulnerabilities
const severityColors: Record<string, string> = {
    critical: "#dc2626",
    high: "#ea580c",
    medium: "#ca8a04",
    low: "#65a30d",
    info: "#0284c7",
};

export default function InteractiveGraph({
    nodes,
    edges,
    onNodeClick,
    onRefresh,
    loading = false,
}: InteractiveGraphProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const networkRef = useRef<Network | null>(null);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

    // Convert data to vis-network format
    const convertToVisNetwork = useCallback(() => {
        const visNodes = new DataSet(
            nodes.map((node) => {
                const colors = nodeColors[node.type] || nodeColors.file;
                const shape = nodeShapes[node.type] || "dot";

                // Use severity color for vulnerabilities
                let bgColor = colors.background;
                if (node.type === "vulnerability" && node.severity) {
                    bgColor = severityColors[node.severity] || colors.background;
                }

                return {
                    id: node.id,
                    label: node.label,
                    shape,
                    color: {
                        background: bgColor,
                        border: colors.border,
                        highlight: {
                            background: colors.highlight,
                            border: colors.border,
                        },
                    },
                    font: {
                        color: "#ffffff",
                        size: node.type === "repository" ? 14 : 12,
                        face: "Inter, system-ui, sans-serif",
                    },
                    size: node.type === "repository" ? 35 : 25,
                    borderWidth: 2,
                    shadow: true,
                    // Store original data
                    title: `${node.type}: ${node.label}`,
                    nodeData: node,
                };
            })
        );

        const visEdges = new DataSet(
            edges.map((edge, index) => ({
                id: `edge-${index}`,
                from: edge.source,
                to: edge.target,
                label: edge.type,
                arrows: "to",
                color: {
                    color: "#4b5563",
                    highlight: "#9ca3af",
                    opacity: 0.8,
                },
                font: {
                    color: "#9ca3af",
                    size: 10,
                    strokeWidth: 0,
                },
                smooth: {
                    enabled: true,
                    type: "curvedCW",
                    roundness: 0.2,
                },
            }))
        );

        return { visNodes, visEdges };
    }, [nodes, edges]);

    // Initialize network
    useEffect(() => {
        if (!containerRef.current || nodes.length === 0) return;

        const { visNodes, visEdges } = convertToVisNetwork();

        const options = {
            nodes: {
                borderWidth: 2,
                shadow: true,
            },
            edges: {
                width: 2,
                selectionWidth: 3,
            },
            physics: {
                enabled: true,
                solver: "forceAtlas2Based",
                forceAtlas2Based: {
                    gravitationalConstant: -50,
                    centralGravity: 0.01,
                    springLength: 100,
                    springConstant: 0.08,
                    damping: 0.4,
                },
                stabilization: {
                    enabled: true,
                    iterations: 200,
                    fit: true,
                },
            },
            interaction: {
                hover: true,
                tooltipDelay: 200,
                zoomView: true,
                dragView: true,
            },
            layout: {
                improvedLayout: true,
            },
        };

        networkRef.current = new Network(
            containerRef.current,
            { nodes: visNodes, edges: visEdges },
            options
        );

        // Handle node click
        networkRef.current.on("click", (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const node = nodes.find((n) => n.id === nodeId);
                if (node) {
                    setSelectedNode(node);
                    onNodeClick?.(node);
                }
            } else {
                setSelectedNode(null);
            }
        });

        // Cleanup
        return () => {
            networkRef.current?.destroy();
        };
    }, [nodes, edges, convertToVisNetwork, onNodeClick]);

    // Control functions
    const handleZoomIn = () => {
        const scale = networkRef.current?.getScale() || 1;
        networkRef.current?.moveTo({ scale: scale * 1.2 });
    };

    const handleZoomOut = () => {
        const scale = networkRef.current?.getScale() || 1;
        networkRef.current?.moveTo({ scale: scale / 1.2 });
    };

    const handleFit = () => {
        networkRef.current?.fit({ animation: true });
    };

    // Export as PNG
    const handleExport = () => {
        if (!containerRef.current) return;
        const canvas = containerRef.current.querySelector("canvas");
        if (canvas) {
            const link = document.createElement("a");
            link.download = "knowledge-graph.png";
            link.href = canvas.toDataURL("image/png");
            link.click();
        }
    };

    if (nodes.length === 0) {
        return (
            <div className="flex items-center justify-center h-[500px] bg-zinc-900 rounded-lg border border-zinc-800">
                <div className="text-center text-zinc-500">
                    <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No graph data available</p>
                    <p className="text-sm mt-2">Select a repository to visualize its knowledge graph</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
            {/* Toolbar */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                    onClick={handleZoomIn}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    title="Zoom In"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
                <button
                    onClick={handleZoomOut}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                <button
                    onClick={handleFit}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    title="Fit to View"
                >
                    <Maximize2 className="w-4 h-4" />
                </button>
                <button
                    onClick={handleExport}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    title="Export as PNG"
                >
                    <Download className="w-4 h-4" />
                </button>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                )}
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-10 bg-zinc-800/90 backdrop-blur-sm rounded-lg p-3 text-xs">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {Object.entries(nodeColors).map(([type, colors]) => (
                        <div key={type} className="flex items-center gap-2">
                            <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: colors.background }}
                            />
                            <span className="text-zinc-300 capitalize">{type}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Graph Container */}
            <div
                ref={containerRef}
                className="w-full h-[500px]"
                style={{ background: "#0a0a0a" }}
            />

            {/* Selected Node Info */}
            {selectedNode && (
                <div className="absolute top-4 left-4 z-10 bg-zinc-800/95 backdrop-blur-sm rounded-lg p-4 max-w-xs">
                    <div className="flex items-center gap-2 mb-2">
                        <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: nodeColors[selectedNode.type]?.background }}
                        />
                        <span className="text-zinc-400 text-xs uppercase">{selectedNode.type}</span>
                    </div>
                    <h4 className="text-white font-medium mb-2">{selectedNode.label}</h4>
                    {selectedNode.severity && (
                        <div className="mb-2">
                            <span
                                className="px-2 py-0.5 rounded text-xs font-medium"
                                style={{
                                    backgroundColor: `${severityColors[selectedNode.severity]}20`,
                                    color: severityColors[selectedNode.severity],
                                }}
                            >
                                {selectedNode.severity}
                            </span>
                        </div>
                    )}
                    {selectedNode.data && (
                        <div className="text-xs text-zinc-400 space-y-1">
                            {Object.entries(selectedNode.data).slice(0, 3).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                    <span className="capitalize">{key.replace(/_/g, " ")}:</span>
                                    <span className="text-zinc-300 truncate max-w-[150px]">
                                        {typeof value === "string" ? value : JSON.stringify(value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Loading overlay */}
            {loading && (
                <div className="absolute inset-0 bg-zinc-900/80 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
            )}
        </div>
    );
}
