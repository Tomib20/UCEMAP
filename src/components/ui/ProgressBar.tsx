import { useMemo } from "react";
import type { Carrera } from "@/types/carrera";
import { useProgressStore, selectAprobadasArray, selectNotasRecord, type Nota } from "@/store/useProgressStore";
import { useThemeStore } from "@/store/useThemeStore";
import { SURFACE } from "@/config/theme";

interface ProgressBarProps {
  carrera: Carrera;
}

function computePromedio(notasRecord: Record<string, Nota>, aprobadasArr: number[]): number | null {
  const numericNotas: number[] = [];
  for (const nro of aprobadasArr) {
    const nota = notasRecord[String(nro)];
    if (typeof nota === "number") {
      numericNotas.push(nota);
    }
  }
  if (numericNotas.length === 0) return null;
  return numericNotas.reduce((a, b) => a + b, 0) / numericNotas.length;
}

interface Section {
  label: string;
  done: number;
  total: number;
  color: string;
}

/**
 * Computes display widths so small sections get a minimum visible size.
 * Assigns a minimum of 8% to each section, then distributes the rest proportionally.
 */
function computeWidths(sections: Section[]): number[] {
  const MIN_PCT = 12;
  const reserved = sections.length * MIN_PCT;
  const remaining = 100 - reserved;
  const grandTotal = sections.reduce((s, sec) => s + sec.total, 0);

  return sections.map((sec) => {
    const proportional = grandTotal > 0 ? (sec.total / grandTotal) * remaining : 0;
    return MIN_PCT + proportional;
  });
}

export function ProgressBar({ carrera }: ProgressBarProps) {
  const aprobadasArr = useProgressStore(selectAprobadasArray);
  const notasRecord = useProgressStore(selectNotasRecord);
  const mode = useThemeStore((s) => s.mode);
  const aprobadas = useMemo(() => new Set(aprobadasArr), [aprobadasArr]);
  const surface = SURFACE[mode];

  const obligatorias = carrera.materias.filter((m) => m.grupo === "obligatoria");
  const topicos = carrera.materias.filter((m) => m.grupo === "topico");
  const tesis = carrera.materias.filter((m) => m.grupo === "tesis");
  const requisitos = carrera.materias.filter((m) => m.grupo === "requisito");
  const talleres = carrera.materias.filter((m) => m.grupo === "taller");

  const sections: Section[] = [
    { label: "Obligatorias", done: obligatorias.filter((m) => aprobadas.has(m.nro)).length, total: obligatorias.length, color: "#3b82f6" },
    { label: "Electivas", done: topicos.filter((m) => aprobadas.has(m.nro)).length, total: carrera.topicos_requeridos, color: "#d97706" },
  ];
  if (talleres.length > 0) {
    sections.push({ label: "Talleres", done: talleres.filter((m) => aprobadas.has(m.nro)).length, total: carrera.talleres_requeridos ?? talleres.length, color: "#db2777" });
  }
  if (tesis.length > 0) {
    sections.push({ label: "Proyecto Final", done: tesis.filter((m) => aprobadas.has(m.nro)).length, total: tesis.length, color: "#7c3aed" });
  }
  if (requisitos.length > 0) {
    sections.push({ label: "Requisitos", done: requisitos.filter((m) => aprobadas.has(m.nro)).length, total: requisitos.length, color: "#94a3b8" });
  }

  const widths = computeWidths(sections);
  const grandTotal = sections.reduce((s, sec) => s + sec.total, 0);
  const grandDone = sections.reduce((s, sec) => s + sec.done, 0);
  const grandPct = grandTotal > 0 ? Math.round((grandDone / grandTotal) * 100) : 0;
  const promedio = computePromedio(notasRecord, aprobadasArr);

  const trackBg = mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const separatorColor = mode === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)";
  const barSep = mode === "dark" ? "#0f172a" : "#fff";

  return (
    <div
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 backdrop-blur-sm rounded-2xl shadow-lg px-6 py-4 flex items-center gap-6"
      style={{
        backgroundColor: mode === "dark" ? "rgba(30,41,59,0.92)" : "rgba(255,255,255,0.95)",
        border: `1px solid ${surface.panelBorder}`,
        width: "min(90%, 900px)",
      }}
    >
      {/* Unified bar section */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        {/* Label row above bar */}
        <div className="flex">
          {sections.map((sec, i) => (
            <div key={sec.label} className="text-center overflow-hidden" style={{ width: `${widths[i]}%` }}>
              <span className="text-[11px] font-medium" style={{ color: surface.textSecondary }}>
                {sec.label}
              </span>
            </div>
          ))}
        </div>
        {/* Bar */}
        <div className="flex h-5 rounded-full overflow-hidden" style={{ backgroundColor: trackBg }}>
          {sections.map((sec, i) => {
            const fillPct = sec.total > 0 ? (sec.done / sec.total) * 100 : 0;
            return (
              <div
                key={sec.label}
                className="relative h-full"
                style={{
                  width: `${widths[i]}%`,
                  borderRight: i < sections.length - 1 ? `2px solid ${barSep}` : undefined,
                }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${fillPct}%`, backgroundColor: sec.color }}
                />
              </div>
            );
          })}
        </div>
        {/* Counts row below bar */}
        <div className="flex">
          {sections.map((sec, i) => (
            <div key={sec.label} className="text-center overflow-hidden" style={{ width: `${widths[i]}%` }}>
              <span className="text-xs font-bold" style={{ color: surface.textPrimary }}>
                {sec.done}/{sec.total}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Separator */}
      <div className="h-12 w-px shrink-0" style={{ backgroundColor: separatorColor }} />

      {/* Stats */}
      <div className="flex items-center gap-5 shrink-0">
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: surface.textPrimary }}>
            {grandPct}%
          </div>
          <div className="text-[11px]" style={{ color: surface.textSecondary }}>
            {grandDone}/{grandTotal} total
          </div>
        </div>
        <div className="h-12 w-px" style={{ backgroundColor: separatorColor }} />
        <div className="text-center">
          <div
            className="text-2xl font-bold"
            style={{ color: promedio !== null ? "#4ade80" : surface.textSecondary }}
          >
            {promedio !== null ? promedio.toFixed(2) : "\u2014"}
          </div>
          <div className="text-[11px]" style={{ color: surface.textSecondary }}>
            Promedio
          </div>
        </div>
      </div>
    </div>
  );
}
