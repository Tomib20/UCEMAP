import { memo, useMemo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { MateriaNodeData } from "@/utils/layoutGraph";
import { GRUPO_COLORS, STATUS_STYLES, CHAIN_COLORS, AVAILABLE_GLOW, NODE_WIDTH_MOBILE } from "@/config/theme";
import { getMateriaStatus } from "@/utils/materiaStatus";
import {
  useProgressStore,
  selectAprobadasArray,
  selectCursandoArray,
  selectNotasRecord,
  selectAplazosRecord,
} from "@/store/useProgressStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useIsMobile } from "@/hooks/useIsMobile";

export type MateriaNode = Node<MateriaNodeData, "materia">;

function MateriaNodeComponent({ data }: NodeProps<MateriaNode>) {
  const materia = data.materia;
  const dimmed = data.dimmed ?? false;
  const role = data.role ?? "none";

  const mode = useThemeStore((s) => s.mode);
  const isMobile = useIsMobile();
  const aprobadasArr = useProgressStore(selectAprobadasArray);
  const cursandoArr = useProgressStore(selectCursandoArray);
  const notasRecord = useProgressStore(selectNotasRecord);
  const aplazosRecord = useProgressStore(selectAplazosRecord);
  const aprobadas = useMemo(() => new Set(aprobadasArr), [aprobadasArr]);
  const cursando = useMemo(() => new Set(cursandoArr), [cursandoArr]);
  const aplazadas = useMemo(
    () => new Set(Object.keys(aplazosRecord).map(Number)),
    [aplazosRecord]
  );

  const status = getMateriaStatus(materia, aprobadas, cursando, aplazadas);
  const notaAplazo = aplazosRecord[String(materia.nro)];
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
    boxShadow = `0 0 0 ${isMobile ? 3 : 4}px ${CHAIN_COLORS.selected.glow}`;
    borderWidth = isMobile ? 2 : 3;
  } else if (role === "ancestor") {
    borderColor = CHAIN_COLORS.ancestor.border;
    boxShadow = `0 0 0 3px ${CHAIN_COLORS.ancestor.glow}`;
  } else if (role === "descendant") {
    borderColor = CHAIN_COLORS.descendant.border;
    boxShadow = `0 0 0 3px ${CHAIN_COLORS.descendant.glow}`;
  } else if (role === "available") {
    // Modo "que puedo cursar": las disponibles quedan con halo celeste.
    borderColor = AVAILABLE_GLOW.border;
    boxShadow = `0 0 0 3px ${AVAILABLE_GLOW.glow}`;
  }

  const opacity = dimmed ? 0.12 : 1;
  const handleClass = mode === "dark"
    ? "!bg-slate-500 !w-2 !h-2 !border-0"
    : "!bg-slate-400 !w-2 !h-2 !border-0";

  const nodeWidth = isMobile ? NODE_WIDTH_MOBILE : 210;
  const fontSize = isMobile ? 11 : 14;
  const badgeSize = isMobile ? 18 : 22;
  const badgeFontSize = isMobile ? 9 : 11;

  return (
    <>
      <Handle type="target" position={Position.Left} className={handleClass} />
      <div
        className="rounded-lg cursor-pointer relative flex flex-col items-center justify-center active:scale-[0.97]"
        style={{
          backgroundColor: bg,
          border: `${borderWidth}px solid ${borderColor}`,
          opacity,
          width: nodeWidth,
          minHeight: isMobile ? 34 : 48,
          paddingTop: isMobile ? 4 : 8,
          paddingBottom: isMobile ? 4 : 8,
          paddingLeft: isMobile ? 6 : 14,
          paddingRight: isMobile ? 6 : 14,
          transition: "opacity 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease",
          boxShadow: boxShadow ?? (mode === "dark" ? "0 2px 6px rgba(0,0,0,0.4)" : "0 2px 5px rgba(0,0,0,0.12)"),
          transform: role === "selected" ? "scale(1.04)" : undefined,
          WebkitTapHighlightColor: "transparent",
        }}
        title={materia.nombre}
      >
        {/* Nota badge */}
        {status === "aprobada" && nota !== undefined && (
          <div
            className="absolute -top-2 -right-2 rounded-full font-bold flex items-center justify-center"
            style={{
              fontSize: badgeFontSize,
              width: nota === "AP" ? badgeSize + 4 : badgeSize,
              height: badgeSize,
              backgroundColor: mode === "dark" ? "#166534" : "#16a34a",
              color: "#fff",
            }}
          >
            {nota === "AP" ? "AP" : nota}
          </div>
        )}
        {/* Aplazo: queda marcado aunque la materia se este recursando */}
        {notaAplazo !== undefined && status !== "aprobada" && (
          <div
            className="absolute -top-2 -left-2 rounded-full font-bold flex items-center justify-center"
            style={{
              fontSize: badgeFontSize,
              width: badgeSize,
              height: badgeSize,
              backgroundColor: mode === "dark" ? "#b91c1c" : "#dc2626",
              color: "#fff",
            }}
            title={`Aplazada con ${notaAplazo}`}
          >
            {notaAplazo}
          </div>
        )}
        {/* Cursando badge */}
        {status === "cursando" && (
          <div
            className="absolute -top-2 -right-2 rounded-full font-bold flex items-center justify-center"
            style={{
              fontSize: isMobile ? 8 : 9,
              width: isMobile ? 16 : 20,
              height: isMobile ? 16 : 20,
              backgroundColor: mode === "dark" ? "#ca8a04" : "#eab308",
              color: "#fff",
            }}
          >
            C
          </div>
        )}
        <div
          className="font-semibold text-center w-full"
          style={{ color: textColor, fontSize, lineHeight: 1.3 }}
        >
          {materia.nombre}
        </div>
        {status === "aprobada" && !isMobile && (
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
