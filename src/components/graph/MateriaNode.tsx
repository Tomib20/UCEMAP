import { memo, useMemo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { MateriaNodeData } from "@/utils/layoutGraph";
import { GRUPO_COLORS, STATUS_STYLES, CHAIN_COLORS } from "@/config/theme";
import { getMateriaStatus } from "@/utils/materiaStatus";
import { useProgressStore, selectAprobadasArray, selectCursandoArray, selectNotasRecord } from "@/store/useProgressStore";
import { useThemeStore } from "@/store/useThemeStore";

export type MateriaNode = Node<MateriaNodeData, "materia">;

function MateriaNodeComponent({ data }: NodeProps<MateriaNode>) {
  const materia = data.materia;
  const dimmed = data.dimmed ?? false;
  const role = data.role ?? "none";

  const mode = useThemeStore((s) => s.mode);
  const aprobadasArr = useProgressStore(selectAprobadasArray);
  const cursandoArr = useProgressStore(selectCursandoArray);
  const notasRecord = useProgressStore(selectNotasRecord);
  const aprobadas = useMemo(() => new Set(aprobadasArr), [aprobadasArr]);
  const cursando = useMemo(() => new Set(cursandoArr), [cursandoArr]);

  const status = getMateriaStatus(materia, aprobadas, cursando);
  const grupo = GRUPO_COLORS[mode][materia.grupo];
  const statusStyle = STATUS_STYLES[mode][status];
  const nota = notasRecord[String(materia.nro)];

  const bg = statusStyle.bg || grupo.bg;
  const textColor = statusStyle.textOverride || (mode === "dark" ? "#ffffff" : "#1a1a1a");

  let borderColor = statusStyle.border || grupo.border;
  let boxShadow: string | undefined;
  let borderWidth = 2;

  if (role === "selected") {
    borderColor = CHAIN_COLORS.selected.border;
    boxShadow = `0 0 0 4px ${CHAIN_COLORS.selected.glow}`;
    borderWidth = 3;
  } else if (role === "ancestor") {
    borderColor = CHAIN_COLORS.ancestor.border;
    boxShadow = `0 0 0 3px ${CHAIN_COLORS.ancestor.glow}`;
  } else if (role === "descendant") {
    borderColor = CHAIN_COLORS.descendant.border;
    boxShadow = `0 0 0 3px ${CHAIN_COLORS.descendant.glow}`;
  }

  const opacity = dimmed ? 0.12 : 1;
  const handleClass = mode === "dark"
    ? "!bg-slate-500 !w-2 !h-2 !border-0"
    : "!bg-slate-400 !w-2 !h-2 !border-0";

  return (
    <>
      <Handle type="target" position={Position.Left} className={handleClass} />
      <div
        className="rounded-lg px-3.5 cursor-pointer relative flex flex-col items-center justify-center"
        style={{
          backgroundColor: bg,
          border: `${borderWidth}px solid ${borderColor}`,
          opacity,
          width: 210,
          minHeight: 48,
          paddingTop: 8,
          paddingBottom: 8,
          transition: "opacity 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease",
          boxShadow: boxShadow ?? (mode === "dark" ? "0 2px 6px rgba(0,0,0,0.4)" : "0 2px 5px rgba(0,0,0,0.12)"),
          transform: role === "selected" ? "scale(1.04)" : undefined,
        }}
        title={materia.nombre}
      >
        {/* Nota badge */}
        {status === "aprobada" && nota !== undefined && (
          <div
            className="absolute -top-2.5 -right-2.5 rounded-full font-bold flex items-center justify-center"
            style={{
              fontSize: 11,
              width: nota === "AP" ? 26 : 22,
              height: 22,
              backgroundColor: mode === "dark" ? "#166534" : "#16a34a",
              color: "#fff",
            }}
          >
            {nota === "AP" ? "AP" : nota}
          </div>
        )}
        {/* Cursando badge */}
        {status === "cursando" && (
          <div
            className="absolute -top-2.5 -right-2.5 rounded-full font-bold flex items-center justify-center"
            style={{
              fontSize: 9,
              width: 20,
              height: 20,
              backgroundColor: mode === "dark" ? "#ca8a04" : "#eab308",
              color: "#fff",
            }}
          >
            C
          </div>
        )}
        <div
          className="font-semibold text-center w-full"
          style={{ color: textColor, fontSize: 14, lineHeight: 1.3 }}
        >
          {materia.nombre}
        </div>
        {status === "aprobada" && (
          <span style={{ color: mode === "dark" ? "#4ade80" : "#16a34a", fontSize: 14, marginTop: 2 }} className="font-bold">
            {"\u2713"}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className={handleClass} />
    </>
  );
}

export const MateriaNode = memo(MateriaNodeComponent);
