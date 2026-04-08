import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type NodeMouseHandler,
  type NodeChange,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import type { Materia, Carrera } from "@/types/carrera";
import { buildGraphLayout } from "@/utils/layoutGraph";
import { CHAIN_COLORS, EDGE_COLORS, SURFACE } from "@/config/theme";
import { buildAdjacencyMaps } from "@/utils/prerequisiteChain";
import { useProgressStore } from "@/store/useProgressStore";
import { useThemeStore } from "@/store/useThemeStore";
import { MateriaNode } from "./MateriaNode";
import { Legend } from "./Legend";

function SpacerNode() {
  return null;
}

const nodeTypes = { materia: MateriaNode, spacer: SpacerNode };

function defaultEdgeStyle(mode: "light" | "dark") {
  return { stroke: EDGE_COLORS[mode].default, strokeWidth: 1.2 };
}

function defaultMarker(mode: "light" | "dark") {
  return { type: MarkerType.ArrowClosed as const, width: 12, height: 12, color: EDGE_COLORS[mode].default };
}

function dimmedEdgeStyle(mode: "light" | "dark") {
  return { stroke: EDGE_COLORS[mode].dimmed, strokeWidth: 0.8 };
}

function dimmedMarker(mode: "light" | "dark") {
  return { type: MarkerType.ArrowClosed as const, width: 10, height: 10, color: EDGE_COLORS[mode].dimmed };
}

function clearNodeFlags(nodes: Node[]): Node[] {
  return nodes.map((n) => ({
    ...n,
    data: { ...n.data, dimmed: false, role: "none" as const },
  }));
}

function clearEdgeStyles(edges: Edge[], mode: "light" | "dark"): Edge[] {
  return edges.map((e) => ({
    ...e,
    animated: false,
    style: defaultEdgeStyle(mode),
    markerEnd: defaultMarker(mode),
  }));
}

function applyChainHighlight(
  nodes: Node[],
  edges: Edge[],
  selectedNro: number,
  directPrereqs: Set<number>,
  directDependents: Set<number>,
  mode: "light" | "dark"
): { nodes: Node[]; edges: Edge[] } {
  const visible = new Set([...directPrereqs, ...directDependents, selectedNro]);

  const updatedNodes = nodes.map((n) => {
    const nro = Number(n.id);
    let role: "selected" | "ancestor" | "descendant" | "none" = "none";
    if (nro === selectedNro) role = "selected";
    else if (directPrereqs.has(nro)) role = "ancestor";
    else if (directDependents.has(nro)) role = "descendant";
    return { ...n, data: { ...n.data, dimmed: !visible.has(nro), role } };
  });

  const updatedEdges = edges.map((e) => {
    const src = Number(e.source);
    const tgt = Number(e.target);
    if (directPrereqs.has(src) && tgt === selectedNro) {
      return { ...e, animated: true, style: { stroke: CHAIN_COLORS.edgeAncestor, strokeWidth: 2.5 }, markerEnd: { type: MarkerType.ArrowClosed as const, width: 16, height: 16, color: CHAIN_COLORS.edgeAncestor } };
    }
    if (src === selectedNro && directDependents.has(tgt)) {
      return { ...e, animated: true, style: { stroke: CHAIN_COLORS.edgeDescendant, strokeWidth: 2.5 }, markerEnd: { type: MarkerType.ArrowClosed as const, width: 16, height: 16, color: CHAIN_COLORS.edgeDescendant } };
    }
    return { ...e, animated: false, style: dimmedEdgeStyle(mode), markerEnd: dimmedMarker(mode) };
  });

  return { nodes: updatedNodes, edges: updatedEdges };
}

interface FlowInnerProps {
  carrera: Carrera;
  showElectivas: boolean;
}

function FlowInner({ carrera, showElectivas }: FlowInnerProps) {
  const selectMateria = useProgressStore((s) => s.selectMateria);
  const mode = useThemeStore((s) => s.mode);
  const selectedRef = useRef<number | null>(null);
  const originalPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const { fitView, setViewport, getViewport } = useReactFlow();
  const TARGET_ZOOM = 0.8;
  const savedViewport = useRef<{ x: number; y: number; zoom: number } | null>(null);

  const doFitView = useCallback((duration = 0) => {
    if (savedViewport.current) {
      // Always restore to the same viewport as initial load
      setViewport(savedViewport.current, { duration });
      return;
    }
    // First time: fitView to center, then force our zoom level
    fitView({ padding: 0.08, duration: 0 });
    const vp = getViewport();
    const ratio = TARGET_ZOOM / vp.zoom;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const newX = centerX - (centerX - vp.x) * ratio;
    const newY = centerY - (centerY - vp.y) * ratio - 40;
    const target = { x: newX, y: newY, zoom: TARGET_ZOOM };
    savedViewport.current = target;
    setViewport(target, { duration });
  }, [fitView, getViewport, setViewport]);

  const adjacency = useMemo(
    () => buildAdjacencyMaps(carrera.materias),
    [carrera.materias]
  );

  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = buildGraphLayout(carrera.materias, showElectivas);
    const edgesStyled = edges.map((e) => ({
      ...e,
      style: defaultEdgeStyle(mode),
      markerEnd: defaultMarker(mode),
    }));
    originalPositions.current.clear();
    for (const n of nodes) {
      originalPositions.current.set(n.id, { ...n.position });
    }
    return { initialNodes: nodes, initialEdges: edgesStyled };
  }, [carrera.materias, mode, showElectivas]);

  const [nodes, setNodes, onNodesChangeBase] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // When showElectivas or mode changes, sync the nodes/edges state
  const prevKeyRef = useRef(`${showElectivas}-${mode}`);
  useEffect(() => {
    const key = `${showElectivas}-${mode}`;
    if (key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      setNodes(initialNodes);
      setEdges(initialEdges);
      // Clear selection
      selectedRef.current = null;
      // Re-fit with same zoom/position as initial view
      setTimeout(() => {
        doFitView(300);
      }, 50);
    }
  }, [showElectivas, mode, initialNodes, initialEdges, setNodes, setEdges, fitView]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const locked = changes.map((change) => {
        if (change.type === "position" && change.position) {
          const node = nodes.find((n) => n.id === change.id);
          if (node) {
            return { ...change, position: { x: node.position.x, y: change.position.y } };
          }
        }
        return change;
      });
      onNodesChangeBase(locked);
    },
    [onNodesChangeBase, nodes]
  );

  const doHighlight = useCallback(
    (nro: number) => {
      const directPrereqs = adjacency.prerequisitesOf.get(nro) ?? new Set();
      const directDependents = adjacency.dependentsOf.get(nro) ?? new Set();
      setNodes((cur) => applyChainHighlight(cur, [], nro, directPrereqs, directDependents, mode).nodes);
      setEdges((cur) => applyChainHighlight([], cur, nro, directPrereqs, directDependents, mode).edges);
    },
    [adjacency, setNodes, setEdges, mode]
  );

  const doClear = useCallback(() => {
    setNodes((cur) => clearNodeFlags(cur));
    setEdges((cur) => clearEdgeStyles(cur, mode));
  }, [setNodes, setEdges, mode]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const nro = Number(node.id);
      if (selectedRef.current === nro) {
        selectedRef.current = null;
        selectMateria(null);
        doClear();
      } else {
        selectedRef.current = nro;
        selectMateria(nro);
        doHighlight(nro);
      }
    },
    [selectMateria, doHighlight, doClear]
  );

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const orig = originalPositions.current.get(node.id);
      if (!orig) return;
      setNodes((cur) =>
        cur.map((n) => (n.id === node.id ? { ...n, position: { ...orig } } : n))
      );
    },
    [setNodes]
  );

  const onInit = useCallback(() => {
    doFitView(0);
  }, [doFitView]);

  const onPaneClick = useCallback(() => {
    selectedRef.current = null;
    selectMateria(null);
    doClear();
  }, [selectMateria, doClear]);

  const surface = SURFACE[mode];

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      onNodeDoubleClick={onNodeDoubleClick}
      onPaneClick={onPaneClick}
      onInit={onInit}
      minZoom={0.15}
      maxZoom={2}
      nodesDraggable
      nodesConnectable={false}
      defaultEdgeOptions={{ type: "default" }}
    >
      <Background color={surface.dots} gap={20} />
      <Controls position="top-right" showInteractive={false} />
      <MiniMap
        position="bottom-right"
        nodeColor={(node) => {
          const materia = (node.data as unknown as { materia: Materia }).materia;
          if (materia.grupo === "obligatoria") return "#3b82f6";
          if (materia.grupo === "topico") return "#d97706";
          if (materia.grupo === "tesis") return "#7c3aed";
          return "#94a3b8";
        }}
        maskColor={mode === "dark" ? "rgba(15,23,42,0.7)" : "rgba(255,255,255,0.7)"}
        style={mode === "dark" ? { backgroundColor: "#1e293b" } : undefined}
      />
    </ReactFlow>
  );
}

interface GraphViewProps {
  carrera: Carrera;
}

export function GraphView({ carrera }: GraphViewProps) {
  const mode = useThemeStore((s) => s.mode);
  const [showElectivas, setShowElectivas] = useState(false);
  const surface = SURFACE[mode];

  return (
    <div className="w-full h-full relative" style={{ backgroundColor: surface.bg }}>
      <ReactFlowProvider>
        <FlowInner carrera={carrera} showElectivas={showElectivas} />
      </ReactFlowProvider>
      <Legend />

      <button
        onClick={() => setShowElectivas((v) => !v)}
        className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border backdrop-blur-sm"
        style={{
          backgroundColor: showElectivas
            ? mode === "dark" ? "rgba(217,119,6,0.25)" : "rgba(217,119,6,0.15)"
            : mode === "dark" ? "rgba(30,41,59,0.9)" : "rgba(255,255,255,0.9)",
          borderColor: showElectivas ? "#d97706" : surface.panelBorder,
          color: showElectivas ? "#d97706" : surface.textSecondary,
        }}
      >
        {showElectivas ? "Ocultar electivas" : "Mostrar electivas"}
      </button>
    </div>
  );
}
