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
import { CHAIN_COLORS, EDGE_COLORS, SURFACE, NODE_WIDTH } from "@/config/theme";
import { buildAdjacencyMaps, getAncestors, getDescendants } from "@/utils/prerequisiteChain";
import { getMateriaStatus } from "@/utils/materiaStatus";
import { useProgressStore, selectAprobadasArray, selectCursandoArray } from "@/store/useProgressStore";
import { useThemeStore } from "@/store/useThemeStore";
import { MateriaNode } from "./MateriaNode";
import { Legend } from "./Legend";

/* ── Decorative node types ── */

function SpacerNode() {
  return null;
}

function YearLabelNode({ data }: { data: { label: string } }) {
  const mode = useThemeStore((s) => s.mode);
  const surface = SURFACE[mode];
  return (
    <div
      className="text-center font-bold text-sm pointer-events-none"
      style={{ color: surface.textSecondary, width: NODE_WIDTH }}
    >
      {data.label}
    </div>
  );
}

function CuatriSeparatorNode() {
  const mode = useThemeStore((s) => s.mode);
  return (
    <div
      className="pointer-events-none flex items-center gap-2"
      style={{ width: NODE_WIDTH + 20 }}
    >
      <div
        className="flex-1 border-t border-dashed"
        style={{ borderColor: mode === "dark" ? "rgba(148,163,184,0.3)" : "rgba(100,116,139,0.25)" }}
      />
      <span
        className="text-[9px] font-semibold uppercase tracking-wider shrink-0"
        style={{ color: mode === "dark" ? "rgba(148,163,184,0.5)" : "rgba(100,116,139,0.4)" }}
      >
        2do cuat.
      </span>
      <div
        className="flex-1 border-t border-dashed"
        style={{ borderColor: mode === "dark" ? "rgba(148,163,184,0.3)" : "rgba(100,116,139,0.25)" }}
      />
    </div>
  );
}

const nodeTypes = { materia: MateriaNode, spacer: SpacerNode, yearLabel: YearLabelNode, cuatriSeparator: CuatriSeparatorNode };

/* ── Edge style helpers ── */

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
  prereqs: Set<number>,
  dependents: Set<number>,
  mode: "light" | "dark"
): { nodes: Node[]; edges: Edge[] } {
  const visible = new Set([...prereqs, ...dependents, selectedNro]);

  const updatedNodes = nodes.map((n) => {
    const nro = Number(n.id);
    let role: "selected" | "ancestor" | "descendant" | "none" = "none";
    if (nro === selectedNro) role = "selected";
    else if (prereqs.has(nro)) role = "ancestor";
    else if (dependents.has(nro)) role = "descendant";
    return { ...n, data: { ...n.data, dimmed: !visible.has(nro), role } };
  });

  const updatedEdges = edges.map((e) => {
    const src = Number(e.source);
    const tgt = Number(e.target);
    const isAncestorEdge = prereqs.has(src) && (tgt === selectedNro || prereqs.has(tgt));
    const isDescendantEdge = (src === selectedNro || dependents.has(src)) && dependents.has(tgt);
    if (isAncestorEdge) {
      return { ...e, animated: true, style: { stroke: CHAIN_COLORS.edgeAncestor, strokeWidth: 2.5 }, markerEnd: { type: MarkerType.ArrowClosed as const, width: 16, height: 16, color: CHAIN_COLORS.edgeAncestor } };
    }
    if (isDescendantEdge) {
      return { ...e, animated: true, style: { stroke: CHAIN_COLORS.edgeDescendant, strokeWidth: 2.5 }, markerEnd: { type: MarkerType.ArrowClosed as const, width: 16, height: 16, color: CHAIN_COLORS.edgeDescendant } };
    }
    return { ...e, animated: false, style: dimmedEdgeStyle(mode), markerEnd: dimmedMarker(mode) };
  });

  return { nodes: updatedNodes, edges: updatedEdges };
}

/* ── Tooltip component ── */

interface TooltipState {
  materia: Materia;
  x: number;
  y: number;
}

function MateriaTooltip({ tooltip, carrera }: { tooltip: TooltipState; carrera: Carrera }) {
  const mode = useThemeStore((s) => s.mode);
  const surface = SURFACE[mode];
  const aprobadasArr = useProgressStore(selectAprobadasArray);
  const cursandoArr = useProgressStore(selectCursandoArray);
  const aprobadas = useMemo(() => new Set(aprobadasArr), [aprobadasArr]);
  const cursando = useMemo(() => new Set(cursandoArr), [cursandoArr]);
  const { materia, x, y } = tooltip;

  const status = getMateriaStatus(materia, aprobadas, cursando);
  const statusLabel: Record<string, string> = {
    aprobada: "Aprobada",
    cursando: "Cursando",
    disponible: "Disponible",
    bloqueada: "Bloqueada",
  };
  const statusColor: Record<string, string> = {
    aprobada: "#16a34a",
    cursando: "#ca8a04",
    disponible: mode === "dark" ? "#60a5fa" : "#3b82f6",
    bloqueada: mode === "dark" ? "#94a3b8" : "#64748b",
  };

  const missingCorrelativas = status === "bloqueada"
    ? materia.correlativas
        .filter((nro) => !aprobadas.has(nro))
        .map((nro) => carrera.materias.find((m) => m.nro === nro)?.nombre)
        .filter(Boolean)
    : [];

  return (
    <div
      className="fixed z-50 pointer-events-none rounded-lg shadow-lg px-3 py-2 max-w-[240px]"
      style={{
        left: x + 16,
        top: y - 10,
        backgroundColor: mode === "dark" ? "#1e293b" : "#ffffff",
        border: `1px solid ${surface.panelBorder}`,
      }}
    >
      <div className="font-semibold text-xs mb-1" style={{ color: surface.textPrimary }}>
        {materia.nombre}
      </div>
      <div className="flex items-center gap-1.5 text-[10px] mb-0.5">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: statusColor[status] }}
        />
        <span style={{ color: statusColor[status], fontWeight: 600 }}>
          {statusLabel[status]}
        </span>
        <span style={{ color: surface.textSecondary }}>
          &middot; {materia.creditos} cr&eacute;d.
        </span>
      </div>
      {missingCorrelativas.length > 0 && (
        <div className="text-[10px] mt-1" style={{ color: surface.textSecondary }}>
          Faltan: {missingCorrelativas.join(", ")}
        </div>
      )}
    </div>
  );
}

/* ── FlowInner ── */

interface FlowInnerProps {
  carrera: Carrera;
  showElectivas: boolean;
}

function FlowInner({ carrera, showElectivas }: FlowInnerProps) {
  const selectMateria = useProgressStore((s) => s.selectMateria);
  const fullChain = useProgressStore((s) => s.fullChain);
  const mode = useThemeStore((s) => s.mode);
  const selectedRef = useRef<number | null>(null);
  const fullChainRef = useRef(fullChain);
  fullChainRef.current = fullChain;
  const originalPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const { fitView, setViewport, getViewport } = useReactFlow();
  const TARGET_ZOOM = 0.8;
  const savedViewport = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const doFitView = useCallback((duration = 0) => {
    if (savedViewport.current) {
      setViewport(savedViewport.current, { duration });
      return;
    }
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

  const prevKeyRef = useRef(`${showElectivas}-${mode}`);
  useEffect(() => {
    const key = `${showElectivas}-${mode}`;
    if (key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      setNodes(initialNodes);
      setEdges(initialEdges);
      selectedRef.current = null;
      setTimeout(() => {
        doFitView(300);
      }, 50);
    }
  }, [showElectivas, mode, initialNodes, initialEdges, setNodes, setEdges, doFitView]);

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
    (nro: number, useFullChain?: boolean) => {
      const full = useFullChain ?? fullChainRef.current;
      const prereqs = full
        ? getAncestors(nro, adjacency)
        : adjacency.prerequisitesOf.get(nro) ?? new Set();
      const dependents = full
        ? getDescendants(nro, adjacency)
        : adjacency.dependentsOf.get(nro) ?? new Set();
      setNodes((cur) => applyChainHighlight(cur, [], nro, prereqs, dependents, mode).nodes);
      setEdges((cur) => applyChainHighlight([], cur, nro, prereqs, dependents, mode).edges);
    },
    [adjacency, setNodes, setEdges, mode]
  );

  // Re-highlight when fullChain toggles and something is selected
  useEffect(() => {
    if (selectedRef.current !== null) {
      doHighlight(selectedRef.current, fullChain);
    }
  }, [fullChain, doHighlight]);

  const doClear = useCallback(() => {
    setNodes((cur) => clearNodeFlags(cur));
    setEdges((cur) => clearEdgeStyles(cur, mode));
  }, [setNodes, setEdges, mode]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.id.startsWith("__")) return;
      const nro = Number(node.id);
      setTooltip(null);
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

  const onNodeMouseEnter: NodeMouseHandler = useCallback(
    (event, node) => {
      if (node.id.startsWith("__")) return;
      if (selectedRef.current !== null) return;
      const materia = (node.data as unknown as { materia: Materia }).materia;
      if (!materia) return;
      setTooltip({ materia, x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY });
    },
    []
  );

  const onNodeMouseLeave: NodeMouseHandler = useCallback(() => {
    setTooltip(null);
  }, []);

  const onInit = useCallback(() => {
    doFitView(0);
  }, [doFitView]);

  const onPaneClick = useCallback(() => {
    selectedRef.current = null;
    selectMateria(null);
    doClear();
    setTooltip(null);
  }, [selectMateria, doClear]);

  const surface = SURFACE[mode];

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
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
            if (node.id.startsWith("__")) return "transparent";
            const materia = (node.data as unknown as { materia: Materia }).materia;
            if (!materia) return "transparent";
            if (materia.grupo === "obligatoria") return "#3b82f6";
            if (materia.grupo === "topico") return "#d97706";
            if (materia.grupo === "tesis") return "#7c3aed";
            return "#94a3b8";
          }}
          maskColor={mode === "dark" ? "rgba(15,23,42,0.7)" : "rgba(255,255,255,0.7)"}
          style={mode === "dark" ? { backgroundColor: "#1e293b" } : undefined}
        />
      </ReactFlow>
      {tooltip && <MateriaTooltip tooltip={tooltip} carrera={carrera} />}
    </>
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
