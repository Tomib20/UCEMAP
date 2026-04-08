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
import { buildGraphLayout, type ElectivasMode } from "@/utils/layoutGraph";
import { CHAIN_COLORS, EDGE_COLORS, SURFACE, NODE_WIDTH } from "@/config/theme";
import { buildAdjacencyMaps, getAncestors, getDescendants } from "@/utils/prerequisiteChain";
import { getMateriaStatus } from "@/utils/materiaStatus";
import { useProgressStore, selectAprobadasArray, selectCursandoArray } from "@/store/useProgressStore";
import { useThemeStore } from "@/store/useThemeStore";
import { MateriaNode } from "./MateriaNode";
import { Legend } from "./Legend";
import { ContextMenu, type ContextMenuState } from "./ContextMenu";

/* ── Decorative node types ── */

function SpacerNode() {
  return null;
}

function YearLabelNode({ data }: { data: { label: string; total?: number; aprobadas?: number; cursando?: number } }) {
  const mode = useThemeStore((s) => s.mode);
  const surface = SURFACE[mode];
  const total = data.total ?? 0;
  const done = data.aprobadas ?? 0;
  const curs = data.cursando ?? 0;
  return (
    <div
      className="text-center pointer-events-none"
      style={{ width: NODE_WIDTH }}
    >
      <div className="font-bold text-sm" style={{ color: surface.textSecondary }}>
        {data.label}
      </div>
      {total > 0 && (
        <div className="text-[10px] mt-0.5" style={{ color: surface.textSecondary }}>
          <span style={{ color: done === total ? "#16a34a" : done > 0 ? "#3b82f6" : surface.textSecondary }}>
            {done}/{total}
          </span>
          {curs > 0 && (
            <span style={{ color: "#ca8a04" }}> + {curs}c</span>
          )}
        </div>
      )}
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

/* ── Hover info (fixed bottom-right) ── */

function MateriaHoverInfo({ materia, carrera, top, left }: { materia: Materia; carrera: Carrera; top: number; left: number }) {
  const mode = useThemeStore((s) => s.mode);
  const surface = SURFACE[mode];
  const aprobadasArr = useProgressStore(selectAprobadasArray);
  const cursandoArr = useProgressStore(selectCursandoArray);
  const aprobadas = useMemo(() => new Set(aprobadasArr), [aprobadasArr]);
  const cursando = useMemo(() => new Set(cursandoArr), [cursandoArr]);

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

  const correlativas = materia.correlativas
    .map((nro) => carrera.materias.find((m) => m.nro === nro))
    .filter(Boolean) as Materia[];

  const missingCorrelativas = status === "bloqueada"
    ? correlativas.filter((m) => !aprobadas.has(m.nro))
    : [];

  return (
    <div
      className="fixed z-50 pointer-events-none rounded-lg shadow-lg px-3 py-2.5 backdrop-blur-sm"
      style={{
        top,
        left,
        backgroundColor: mode === "dark" ? "rgba(30,41,59,0.95)" : "rgba(255,255,255,0.97)",
        border: `1px solid ${surface.panelBorder}`,
        minWidth: 180,
        maxWidth: 260,
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
          &middot; {materia.anio}&deg; A&ntilde;o C{materia.cuatrimestre} &middot; {materia.creditos} cr&eacute;d.
        </span>
      </div>
      {correlativas.length > 0 && (
        <div className="text-[10px] mt-1" style={{ color: surface.textSecondary }}>
          Correlativas: {correlativas.map((m) => (
            <span key={m.nro}>
              <span style={{ color: aprobadas.has(m.nro) ? "#16a34a" : surface.textSecondary }}>
                {m.nombre}
              </span>
              {m !== correlativas[correlativas.length - 1] && ", "}
            </span>
          ))}
        </div>
      )}
      {missingCorrelativas.length > 0 && (
        <div className="text-[10px] mt-0.5" style={{ color: "#ca8a04" }}>
          Faltan: {missingCorrelativas.map((m) => m.nombre).join(", ")}
        </div>
      )}
    </div>
  );
}

/* ── FlowInner ── */

interface FlowInnerProps {
  carrera: Carrera;
  electivasMode: ElectivasMode;
}

function FlowInner({ carrera, electivasMode }: FlowInnerProps) {
  const selectMateria = useProgressStore((s) => s.selectMateria);
  const fullChain = useProgressStore((s) => s.fullChain);
  const aprobadasArr = useProgressStore(selectAprobadasArray);
  const cursandoArr = useProgressStore(selectCursandoArray);
  const mode = useThemeStore((s) => s.mode);
  const selectedRef = useRef<number | null>(null);
  const fullChainRef = useRef(fullChain);
  fullChainRef.current = fullChain;
  const originalPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const { setViewport } = useReactFlow();
  const [hoverInfo, setHoverInfo] = useState<{ materia: Materia; top: number; left: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Compute year stats
  const yearStats = useMemo(() => {
    const aprobadas = new Set(aprobadasArr);
    const cursando = new Set(cursandoArr);
    const stats = new Map<number, { total: number; aprobadas: number; cursando: number }>();
    for (const m of carrera.materias) {
      if (m.grupo !== "obligatoria") continue;
      if (!stats.has(m.anio)) stats.set(m.anio, { total: 0, aprobadas: 0, cursando: 0 });
      const s = stats.get(m.anio)!;
      s.total++;
      if (aprobadas.has(m.nro)) s.aprobadas++;
      else if (cursando.has(m.nro)) s.cursando++;
    }
    return stats;
  }, [carrera.materias, aprobadasArr, cursandoArr]);

  // Compute a good viewport: fit all visible materia nodes (excluding spacer/labels/separators)
  // into the available area, leaving room for the sidebar (right ~320px) and progress bar (bottom ~100px).
  const computeViewport = useCallback((nodesToFit: Node[]) => {
    const materiaNodes = nodesToFit.filter((n) => !n.id.startsWith("__"));
    if (materiaNodes.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of materiaNodes) {
      const w = (n.width as number | undefined) ?? 210;
      const h = (n.height as number | undefined) ?? 60;
      if (n.position.x < minX) minX = n.position.x;
      if (n.position.y < minY) minY = n.position.y;
      if (n.position.x + w > maxX) maxX = n.position.x + w;
      if (n.position.y + h > maxY) maxY = n.position.y + h;
    }
    const contentW = maxX - minX;
    const contentH = maxY - minY;

    // Available viewport area (accounting for fixed UI overlays)
    const SIDEBAR = 0; // sidebar only opens on selection, not by default
    const HEADER = 60;
    const BOTTOM_BAR = 100;
    const PADDING = 60;
    const availW = window.innerWidth - SIDEBAR - PADDING * 2;
    const availH = window.innerHeight - HEADER - BOTTOM_BAR - PADDING * 2;

    const zoomX = availW / contentW;
    const zoomY = availH / contentH;
    let zoom = Math.min(zoomX, zoomY) * 0.85; // pull back a notch for breathing room
    zoom = Math.max(0.2, Math.min(1.2, zoom));

    // Center the content (shift slightly up so it doesn't sit on top of the bottom bar)
    const VERTICAL_NUDGE = 60;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const screenCenterX = (window.innerWidth - SIDEBAR) / 2;
    const screenCenterY = HEADER + (window.innerHeight - HEADER - BOTTOM_BAR) / 2 - VERTICAL_NUDGE;
    return {
      x: screenCenterX - centerX * zoom,
      y: screenCenterY - centerY * zoom,
      zoom,
    };
  }, []);

  const adjacency = useMemo(
    () => buildAdjacencyMaps(carrera.materias),
    [carrera.materias]
  );

  const { initialNodes, initialEdges } = useMemo(() => {
    const aprobadas = new Set(aprobadasArr);
    const cursando = new Set(cursandoArr);
    const { nodes, edges } = buildGraphLayout(carrera.materias, electivasMode, aprobadas, cursando);
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
  }, [carrera.materias, mode, electivasMode, aprobadasArr, cursandoArr]);

  const doFitView = useCallback((duration = 0, nodesToFit?: Node[]) => {
    const target = computeViewport(nodesToFit ?? initialNodes);
    if (target) {
      setViewport(target, { duration });
    }
  }, [computeViewport, setViewport, initialNodes]);

  const [nodes, setNodes, onNodesChangeBase] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const prevKeyRef = useRef(`${electivasMode}-${mode}`);
  useEffect(() => {
    const key = `${electivasMode}-${mode}`;
    if (key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      setNodes(initialNodes);
      setEdges(initialEdges);
      selectedRef.current = null;
      setTimeout(() => {
        doFitView(300, initialNodes);
      }, 50);
    }
  }, [electivasMode, mode, initialNodes, initialEdges, setNodes, setEdges, doFitView]);

  // Update year label nodes with stats
  useEffect(() => {
    setNodes((cur) =>
      cur.map((n) => {
        if (!n.id.startsWith("__year-")) return n;
        const anio = Number(n.id.replace("__year-", ""));
        const stats = yearStats.get(anio);
        if (!stats) return n;
        return { ...n, data: { ...n.data, total: stats.total, aprobadas: stats.aprobadas, cursando: stats.cursando } };
      })
    );
  }, [yearStats, setNodes]);

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
      setHoverInfo(null);
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

  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      if (node.id.startsWith("__")) return;
      const materia = (node.data as unknown as { materia: Materia }).materia;
      if (!materia) return;
      setContextMenu({ materia, x: (event as unknown as MouseEvent).clientX, y: (event as unknown as MouseEvent).clientY });
    },
    []
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (contextMenu) { setContextMenu(null); return; }
        if (selectedRef.current !== null) {
          selectedRef.current = null;
          selectMateria(null);
          doClear();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [contextMenu, selectMateria, doClear]);

  const onNodeMouseEnter: NodeMouseHandler = useCallback(
    (event, node) => {
      if (node.id.startsWith("__")) return;
      const materia = (node.data as unknown as { materia: Materia }).materia;
      if (!materia) return;
      const target = (event.target as HTMLElement).closest(".react-flow__node") as HTMLElement | null;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      setHoverInfo({ materia, top: rect.top, left: rect.right + 8 });
    },
    []
  );

  const onNodeMouseLeave: NodeMouseHandler = useCallback(() => {
    setHoverInfo(null);
  }, []);

  const onInit = useCallback(() => {
    doFitView(0);
  }, [doFitView]);

  const onPaneClick = useCallback(() => {
    selectedRef.current = null;
    selectMateria(null);
    doClear();
    setHoverInfo(null);
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
        onNodeContextMenu={onNodeContextMenu}
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
        <Controls
          position="top-right"
          showInteractive={false}
          onFitView={() => doFitView(300)}
        />
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            if (node.id.startsWith("__")) return "transparent";
            const materia = (node.data as unknown as { materia: Materia }).materia;
            if (!materia) return "transparent";
            if (aprobadasArr.includes(materia.nro)) return mode === "dark" ? "#4ade80" : "#16a34a";
            if (cursandoArr.includes(materia.nro)) return mode === "dark" ? "#facc15" : "#eab308";
            if (materia.grupo === "obligatoria") return "#3b82f6";
            if (materia.grupo === "topico") return "#d97706";
            if (materia.grupo === "tesis") return "#7c3aed";
            if (materia.grupo === "taller") return "#db2777";
            return "#94a3b8";
          }}
          maskColor={mode === "dark" ? "rgba(15,23,42,0.7)" : "rgba(255,255,255,0.7)"}
          style={mode === "dark" ? { backgroundColor: "#1e293b" } : undefined}
        />
      </ReactFlow>
      {hoverInfo && <MateriaHoverInfo materia={hoverInfo.materia} carrera={carrera} top={hoverInfo.top} left={hoverInfo.left} />}
      {contextMenu && <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />}
    </>
  );
}

interface GraphViewProps {
  carrera: Carrera;
}

export function GraphView({ carrera }: GraphViewProps) {
  const mode = useThemeStore((s) => s.mode);
  const aprobadasArr = useProgressStore(selectAprobadasArray);
  const cursandoArr = useProgressStore(selectCursandoArray);
  const [electivasMode, setElectivasMode] = useState<ElectivasMode>("hidden");
  const surface = SURFACE[mode];

  // Reset electivas mode when carrera changes
  const carreraIdRef = useRef(carrera.id);
  useEffect(() => {
    if (carreraIdRef.current !== carrera.id) {
      carreraIdRef.current = carrera.id;
      setElectivasMode("hidden");
    }
  }, [carrera.id]);

  // Detect if there are any active (aprobadas/cursando) topicos/talleres
  const hasActiveElectivas = useMemo(() => {
    const ap = new Set(aprobadasArr);
    const cu = new Set(cursandoArr);
    return carrera.materias.some(
      (m) => (m.grupo === "topico" || m.grupo === "taller") && (ap.has(m.nro) || cu.has(m.nro))
    );
  }, [carrera.materias, aprobadasArr, cursandoArr]);

  // Cycle: hidden -> (active if hasActive) -> all -> hidden
  const cycleElectivas = () => {
    setElectivasMode((cur) => {
      if (cur === "hidden") return hasActiveElectivas ? "active" : "all";
      if (cur === "active") return "all";
      return "hidden";
    });
  };

  const buttonLabel =
    electivasMode === "hidden" ? "Mostrar electivas"
    : electivasMode === "active" ? "Ver todas las electivas"
    : "Ocultar electivas";

  const isHighlighted = electivasMode !== "hidden";

  return (
    <div className="w-full h-full relative" style={{ backgroundColor: surface.bg }}>
      <ReactFlowProvider key={carrera.id}>
        <FlowInner carrera={carrera} electivasMode={electivasMode} />
      </ReactFlowProvider>
      <Legend />

      <button
        onClick={cycleElectivas}
        className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border backdrop-blur-sm"
        style={{
          backgroundColor: isHighlighted
            ? mode === "dark" ? "rgba(217,119,6,0.25)" : "rgba(217,119,6,0.15)"
            : mode === "dark" ? "rgba(30,41,59,0.9)" : "rgba(255,255,255,0.9)",
          borderColor: isHighlighted ? "#d97706" : surface.panelBorder,
          color: isHighlighted ? "#d97706" : surface.textSecondary,
        }}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
