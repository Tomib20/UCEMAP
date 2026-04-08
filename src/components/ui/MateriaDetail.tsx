import { useMemo } from "react";
import type { Carrera, Materia } from "@/types/carrera";
import { GRUPO_COLORS, SURFACE } from "@/config/theme";
import { getMateriaStatus } from "@/utils/materiaStatus";
import { useProgressStore, selectAprobadasArray, selectCursandoArray, selectNotasRecord, type Nota } from "@/store/useProgressStore";
import { useThemeStore } from "@/store/useThemeStore";

const NOTA_OPTIONS: Nota[] = ["AP", 4, 5, 6, 7, 8, 9, 10];

interface MateriaDetailProps {
  carrera: Carrera;
}

export function MateriaDetail({ carrera }: MateriaDetailProps) {
  const selectedNro = useProgressStore((s) => s.selectedMateria);
  const aprobadasArr = useProgressStore(selectAprobadasArray);
  const cursandoArr = useProgressStore(selectCursandoArray);
  const notasRecord = useProgressStore(selectNotasRecord);
  const aprobadas = useMemo(() => new Set(aprobadasArr), [aprobadasArr]);
  const cursando = useMemo(() => new Set(cursandoArr), [cursandoArr]);
  const toggleAprobada = useProgressStore((s) => s.toggleAprobada);
  const toggleCursando = useProgressStore((s) => s.toggleCursando);
  const setNota = useProgressStore((s) => s.setNota);
  const selectMateria = useProgressStore((s) => s.selectMateria);
  const mode = useThemeStore((s) => s.mode);

  if (selectedNro === null) return null;

  const materia = carrera.materias.find((m) => m.nro === selectedNro);
  if (!materia) return null;

  const status = getMateriaStatus(materia, aprobadas, cursando);
  const grupo = GRUPO_COLORS[mode][materia.grupo];
  const surface = SURFACE[mode];
  const currentNota = notasRecord[String(materia.nro)];

  const correlativasNombres = materia.correlativas
    .map((nro) => carrera.materias.find((m) => m.nro === nro))
    .filter(Boolean) as Materia[];

  const desbloquea = carrera.materias.filter((m) =>
    m.correlativas.includes(materia.nro)
  );

  const canCursar = status === "disponible" || status === "cursando";
  const canAprobar = status === "disponible" || status === "cursando" || status === "aprobada";

  // Can't remove aprobada if a dependent materia is also aprobada or cursando
  const hasAprobadaDependent = status === "aprobada" && desbloquea.some(
    (m) => aprobadas.has(m.nro) || cursando.has(m.nro)
  );
  const dependentesAprobadas = status === "aprobada"
    ? desbloquea.filter((m) => aprobadas.has(m.nro) || cursando.has(m.nro)).map((m) => m.nombre)
    : [];

  const handleCursando = () => {
    toggleCursando(materia.nro);
  };

  const handleAprobada = () => {
    if (status !== "aprobada") {
      toggleAprobada(materia.nro);
      setNota(materia.nro, "AP");
    } else {
      toggleAprobada(materia.nro);
    }
  };

  return (
    <div
      className="absolute top-0 right-0 w-80 h-full shadow-lg z-20 overflow-y-auto"
      style={{
        backgroundColor: surface.panel,
        borderLeft: `1px solid ${surface.panelBorder}`,
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ backgroundColor: grupo.bg, color: grupo.text }}
          >
            {grupo.label}
          </div>
          <button
            onClick={() => selectMateria(null)}
            className="text-lg leading-none hover:opacity-70"
            style={{ color: surface.textSecondary }}
          >
            &times;
          </button>
        </div>

        <h3 className="text-base font-bold leading-tight mb-1" style={{ color: surface.textPrimary }}>
          {materia.nombre}
        </h3>
        <p className="text-xs mb-4" style={{ color: surface.textSecondary }}>
          #{materia.nro} &middot; {materia.anio}&deg; Ano C{materia.cuatrimestre}{" "}
          &middot; {materia.creditos} credito(s)
        </p>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 mb-4">
          {/* Cursando */}
          <button
            onClick={handleCursando}
            className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-colors border ${
              status === "cursando"
                ? mode === "dark"
                  ? "bg-yellow-900/40 text-yellow-400 border-yellow-700 hover:bg-yellow-900/60"
                  : "bg-yellow-100 text-yellow-700 border-yellow-400 hover:bg-yellow-200"
                : canCursar
                  ? mode === "dark"
                    ? "bg-yellow-900/20 text-yellow-500 border-yellow-800 hover:bg-yellow-900/40"
                    : "bg-yellow-50 text-yellow-600 border-yellow-300 hover:bg-yellow-100"
                  : mode === "dark"
                    ? "bg-slate-800 text-slate-500 border-slate-600 cursor-not-allowed"
                    : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
            }`}
            disabled={!canCursar}
          >
            {status === "cursando"
              ? "\u25CF Cursando \u2014 click para desmarcar"
              : canCursar
                ? "Marcar como cursando"
                : "No disponible"}
          </button>

          {/* Aprobada */}
          <button
            onClick={handleAprobada}
            className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-colors border ${
              status === "aprobada" && !hasAprobadaDependent
                ? mode === "dark"
                  ? "bg-green-900/40 text-green-400 border-green-700 hover:bg-green-900/60"
                  : "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
                : status === "aprobada" && hasAprobadaDependent
                  ? mode === "dark"
                    ? "bg-green-900/40 text-green-400 border-green-700 opacity-60 cursor-not-allowed"
                    : "bg-green-100 text-green-700 border-green-300 opacity-60 cursor-not-allowed"
                  : canAprobar
                    ? mode === "dark"
                      ? "bg-green-900/20 text-green-500 border-green-800 hover:bg-green-900/40"
                      : "bg-green-50 text-green-600 border-green-300 hover:bg-green-100"
                    : mode === "dark"
                      ? "bg-slate-800 text-slate-500 border-slate-600 cursor-not-allowed"
                      : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
            }`}
            disabled={hasAprobadaDependent || (!canAprobar && status !== "aprobada")}
          >
            {status === "aprobada" && hasAprobadaDependent
              ? "\u2713 Aprobada \u2014 no se puede desmarcar"
              : status === "aprobada"
                ? "\u2713 Aprobada \u2014 click para desmarcar"
                : canAprobar
                  ? "Marcar como aprobada"
                  : "Bloqueada \u2014 faltan correlativas"}
          </button>
          {hasAprobadaDependent && (
            <p className="text-[10px] mt-1" style={{ color: mode === "dark" ? "#f87171" : "#dc2626" }}>
              No se puede desmarcar porque {dependentesAprobadas.join(", ")} depende de esta materia.
            </p>
          )}
        </div>

        {/* Nota selector */}
        {status === "aprobada" && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: surface.textSecondary }}>
              Nota
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {NOTA_OPTIONS.map((n) => {
                const isActive = currentNota === n;
                return (
                  <button
                    key={String(n)}
                    onClick={() => setNota(materia.nro, n)}
                    className="px-2.5 py-1 rounded text-xs font-semibold border transition-colors"
                    style={{
                      backgroundColor: isActive
                        ? mode === "dark" ? "#0ea5e9" : "#0284c7"
                        : mode === "dark" ? "#1e293b" : "#f1f5f9",
                      color: isActive
                        ? "#fff"
                        : mode === "dark" ? "#94a3b8" : "#64748b",
                      borderColor: isActive
                        ? "transparent"
                        : mode === "dark" ? "#334155" : "#e2e8f0",
                    }}
                  >
                    {n === "AP" ? "AP" : n}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: surface.textSecondary }}>
              AP = aprobada sin nota (no afecta promedio)
            </p>
          </div>
        )}

        {correlativasNombres.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: surface.textSecondary }}>
              Correlativas (prerequisitos)
            </h4>
            <ul className="space-y-1">
              {correlativasNombres.map((m) => (
                <li
                  key={m.nro}
                  className="text-xs flex items-center gap-1.5 cursor-pointer hover:opacity-70"
                  style={{ color: surface.textPrimary }}
                  onClick={() => selectMateria(m.nro)}
                >
                  {aprobadas.has(m.nro) ? (
                    <span className="text-green-500">&#10003;</span>
                  ) : cursando.has(m.nro) ? (
                    <span className="text-yellow-500">&#9679;</span>
                  ) : (
                    <span style={{ color: surface.textSecondary }}>&#9675;</span>
                  )}
                  {m.nombre}
                </li>
              ))}
            </ul>
          </div>
        )}

        {desbloquea.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: surface.textSecondary }}>
              Desbloquea
            </h4>
            <ul className="space-y-1">
              {desbloquea.map((m) => (
                <li
                  key={m.nro}
                  className="text-xs flex items-center gap-1.5 cursor-pointer hover:opacity-70"
                  style={{ color: surface.textPrimary }}
                  onClick={() => selectMateria(m.nro)}
                >
                  {aprobadas.has(m.nro) ? (
                    <span className="text-green-500">&#10003;</span>
                  ) : cursando.has(m.nro) ? (
                    <span className="text-yellow-500">&#9679;</span>
                  ) : (
                    <span style={{ color: surface.textSecondary }}>&#9654;</span>
                  )}
                  {m.nombre}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
