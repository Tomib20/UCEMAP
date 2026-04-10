import type { Node, Edge } from "@xyflow/react";
import type { Materia } from "@/types/carrera";
import { NODE_WIDTH, NODE_HEIGHT } from "@/config/theme";

export interface MateriaNodeData extends Record<string, unknown> {
  materia: Materia;
  dimmed?: boolean;
  role?: "selected" | "ancestor" | "descendant" | "none";
}

export const COL_WIDTH = 250;
export const ROW_HEIGHT = 92;
export const CUATRI_GAP = 36;
const TOP_OFFSET = 0;
const LABEL_HEIGHT = 36;

export type ElectivasMode = "hidden" | "active" | "all";

/**
 * Layout: 5 columns (one per year), up to 8 rows each (4 C1 + gap + 4 C2).
 * Extra column: tesis + requisito at top, then electivas below.
 *
 * `electivasMode` controls visibility of topicos/talleres:
 *   - "hidden": no topicos/talleres shown
 *   - "active": only those in aprobadas or cursando
 *   - "all": every topico/taller from the plan
 */
export function buildGraphLayout(
  materias: Materia[],
  electivasMode: ElectivasMode = "hidden",
  aprobadas: Set<number> = new Set(),
  cursando: Set<number> = new Set()
): {
  nodes: Node[];
  edges: Edge[];
} {
  const obligatorias = materias.filter((m) => m.grupo === "obligatoria");
  const allTopicos = materias.filter((m) => m.grupo === "topico");
  const tesis = materias.filter((m) => m.grupo === "tesis");
  const requisitos = materias.filter((m) => m.grupo === "requisito");
  const allTalleres = materias.filter((m) => m.grupo === "taller");

  // Filter topicos/talleres based on mode
  const topicos = electivasMode === "active"
    ? allTopicos.filter((m) => aprobadas.has(m.nro) || cursando.has(m.nro))
    : allTopicos;
  const talleres = electivasMode === "active"
    ? allTalleres.filter((m) => aprobadas.has(m.nro) || cursando.has(m.nro))
    : allTalleres;
  const showElectivas = electivasMode !== "hidden";

  const nodes: Node[] = [];

  // Group obligatorias by year
  const byYear = new Map<number, { c1: Materia[]; c2: Materia[] }>();
  for (const m of obligatorias) {
    if (!byYear.has(m.anio)) byYear.set(m.anio, { c1: [], c2: [] });
    const group = byYear.get(m.anio)!;
    if (m.cuatrimestre === 1) group.c1.push(m);
    else group.c2.push(m);
  }

  for (const [anio, { c1, c2 }] of byYear) {
    const colIndex = anio - 1;
    const x = colIndex * COL_WIDTH + 40;

    // Year label node
    nodes.push({
      id: `__year-${anio}`,
      type: "yearLabel",
      position: { x, y: -LABEL_HEIGHT - 10 },
      data: { label: `${anio}\u00B0 A\u00F1o` },
      selectable: false,
      draggable: false,
      focusable: false,
    });

    for (let i = 0; i < c1.length; i++) {
      nodes.push({
        id: String(c1[i].nro),
        type: "materia",
        position: { x, y: i * ROW_HEIGHT + TOP_OFFSET },
        data: { materia: c1[i] } as MateriaNodeData,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    }

    // Cuatrimestre separator node
    if (c1.length > 0 && c2.length > 0) {
      const sepY = c1.length * ROW_HEIGHT + TOP_OFFSET + (CUATRI_GAP - 2) / 2;
      nodes.push({
        id: `__sep-${anio}`,
        type: "cuatriSeparator",
        position: { x: x - 10, y: sepY },
        data: {},
        selectable: false,
        draggable: false,
        focusable: false,
      });
    }

    const c2StartY = c1.length * ROW_HEIGHT + CUATRI_GAP + TOP_OFFSET;
    for (let i = 0; i < c2.length; i++) {
      nodes.push({
        id: String(c2[i].nro),
        type: "materia",
        position: { x, y: c2StartY + i * ROW_HEIGHT },
        data: { materia: c2[i] } as MateriaNodeData,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    }
  }

  // Calculate max year column height in "rows" (c1 rows + cuatri gap + c2 rows).
  // This is used as the wrap height for electivas/talleres so they form a block
  // similar in height to the obligatorias columns.
  let maxYearRows = 0;
  for (const { c1, c2 } of byYear.values()) {
    // Treat the cuatri gap as 1 extra row equivalent
    const rows = c1.length + (c1.length > 0 && c2.length > 0 ? 1 : 0) + c2.length;
    if (rows > maxYearRows) maxYearRows = rows;
  }
  if (maxYearRows < 6) maxYearRows = 6; // sensible minimum

  // Extra column: tesis + requisito at top, electivas/talleres below
  const maxAnio = Math.max(...[...byYear.keys()], 1);
  const extraX = maxAnio * COL_WIDTH + 80;
  const EXTRA_COL2_X = extraX + COL_WIDTH;
  let extraY = TOP_OFFSET;

  // Tesis & requisitos side by side at top
  for (let i = 0; i < tesis.length; i++) {
    nodes.push({
      id: String(tesis[i].nro),
      type: "materia",
      position: { x: extraX, y: extraY + i * ROW_HEIGHT },
      data: { materia: tesis[i] } as MateriaNodeData,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  }
  for (let i = 0; i < requisitos.length; i++) {
    nodes.push({
      id: String(requisitos[i].nro),
      type: "materia",
      position: { x: EXTRA_COL2_X, y: extraY + i * ROW_HEIGHT },
      data: { materia: requisitos[i] } as MateriaNodeData,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  }

  // Electivas + talleres below tesis/requisito.
  // Wrap into multiple columns: each column is at most maxYearRows tall, but
  // when items don't fill that height, distribute them evenly across columns.
  if (showElectivas) {
    const tesisHeight = Math.max(tesis.length, requisitos.length);
    const electivasStartY = extraY + tesisHeight * ROW_HEIGHT + (tesisHeight > 0 ? CUATRI_GAP : 0);

    const layoutBlock = (
      items: Materia[],
      startX: number,
    ): { cols: number } => {
      if (items.length === 0) return { cols: 0 };
      const cols = Math.max(1, Math.ceil(items.length / maxYearRows));
      const rowsPerCol = Math.ceil(items.length / cols); // balanced
      for (let i = 0; i < items.length; i++) {
        const col = Math.floor(i / rowsPerCol);
        const row = i % rowsPerCol;
        nodes.push({
          id: String(items[i].nro),
          type: "materia",
          position: {
            x: startX + col * COL_WIDTH,
            y: electivasStartY + row * ROW_HEIGHT,
          },
          data: { materia: items[i] } as MateriaNodeData,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        });
      }
      return { cols };
    };

    const { cols: topicCols } = layoutBlock(topicos, extraX);
    const tallerStartX = extraX + topicCols * COL_WIDTH + (topicCols > 0 ? 30 : 0);
    layoutBlock(talleres, tallerStartX);
  }

  // Invisible spacer at the bottom to shift fitView center upward
  const maxY = Math.max(...nodes.map((n) => n.position.y));
  nodes.push({
    id: "__spacer",
    type: "spacer",
    position: { x: 0, y: maxY + 120 },
    data: {},
    selectable: false,
    draggable: false,
    focusable: false,
  });

  // Edges (only between visible nodes)
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: Edge[] = [];
  for (const m of materias) {
    if (!nodeIds.has(String(m.nro))) continue;
    for (const prereqNro of m.correlativas) {
      if (!nodeIds.has(String(prereqNro))) continue;
      edges.push({
        id: `e-${prereqNro}-${m.nro}`,
        source: String(prereqNro),
        target: String(m.nro),
        type: "default",
        animated: false,
        style: { stroke: "#94a3b8", strokeWidth: 1.5 },
      });
    }
  }

  return { nodes, edges };
}

export function getColumnLabels(): { label: string; x: number }[] {
  const labels: { label: string; x: number }[] = [];
  for (let anio = 1; anio <= 5; anio++) {
    labels.push({
      label: `${anio}\u00B0 Ano`,
      x: (anio - 1) * COL_WIDTH + 40,
    });
  }
  return labels;
}
