import { useMemo, useState, useRef, useCallback } from "react";
import type { Carrera, Materia } from "@/types/carrera";
import { GRUPO_COLORS, SURFACE } from "@/config/theme";
import { getMateriaStatus } from "@/utils/materiaStatus";
import {
  useProgressStore,
  selectAprobadasArray,
  selectCursandoArray,
  selectNotasRecord,
  selectAplazosRecord,
  type Nota,
  type NotaAplazo,
} from "@/store/useProgressStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useIsMobile } from "@/hooks/useIsMobile";

const NOTA_OPTIONS: Nota[] = ["AP", 4, 5, 6, 7, 8, 9, 10];
const NOTA_APLAZO_OPTIONS: NotaAplazo[] = [0, 1, 2, 3];

const MAIL_REPORTES = "tomasbruner20@gmail.com";

/**
 * Arma el mail de reporte con el contexto ya escrito: sin esto la mayoria de los
 * errores de datos no vuelven nunca, o llegan como "hay algo mal en el mapa".
 */
function mailtoReporte(carrera: Carrera, materia: Materia, correlativas: Materia[]): string {
  const asunto = `Error en ${materia.nombre} (${carrera.nombre})`;
  const cuerpo = [
    `Carrera: ${carrera.nombre} (${carrera.id})`,
    `Materia: ${materia.nombre} - nro ${materia.nro}`,
    `Anio ${materia.anio}, cuatrimestre ${materia.cuatrimestre}, ${materia.creditos} credito(s)`,
    `Correlativas que muestra el mapa: ${correlativas.length > 0 ? correlativas.map((m) => m.nombre).join(", ") : "ninguna"}`,
    "",
    "Que esta mal / que dice el plan oficial:",
    "",
  ].join("\n");
  return `mailto:${MAIL_REPORTES}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}

interface MateriaDetailProps {
  carrera: Carrera;
}

export function MateriaDetail({ carrera }: MateriaDetailProps) {
  const selectedNro = useProgressStore((s) => s.selectedMateria);
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
  const toggleAprobada = useProgressStore((s) => s.toggleAprobada);
  const toggleCursando = useProgressStore((s) => s.toggleCursando);
  const setNota = useProgressStore((s) => s.setNota);
  const setAplazo = useProgressStore((s) => s.setAplazo);
  const quitarAplazo = useProgressStore((s) => s.quitarAplazo);
  const selectMateria = useProgressStore((s) => s.selectMateria);
  const fullChain = useProgressStore((s) => s.fullChain);
  const toggleFullChain = useProgressStore((s) => s.toggleFullChain);
  const mode = useThemeStore((s) => s.mode);
  const isMobile = useIsMobile();

  const isOpen = selectedNro !== null;

  const materia = isOpen
    ? carrera.materias.find((m) => m.nro === selectedNro) ?? null
    : null;

  if (!materia) {
    // On mobile: render nothing if closed. On desktop: render nothing either.
    if (!isOpen) return null;
    return null;
  }

  const status = getMateriaStatus(materia, aprobadas, cursando, aplazadas);
  const notaAplazo = aplazosRecord[String(materia.nro)];
  // Una materia aprobada (con nota o con "AP") no puede llevar aplazo.
  const estaAprobada = status === "aprobada";
  const grupo = GRUPO_COLORS[mode][materia.grupo];
  const surface = SURFACE[mode];
  const currentNota = notasRecord[String(materia.nro)];

  const correlativasNombres = materia.correlativas
    .map((nro) => carrera.materias.find((m) => m.nro === nro))
    .filter(Boolean) as Materia[];

  const desbloquea = carrera.materias.filter((m) =>
    m.correlativas.includes(materia.nro)
  );

  // Se mira la disponibilidad real y no el status: una materia aplazada tiene el
  // status "aplazada" pero se puede volver a cursar y aprobar.
  const correlativasCumplidas = materia.correlativas.every((nro) => aprobadas.has(nro));
  const canCursar = correlativasCumplidas || status === "cursando";
  const canAprobar = correlativasCumplidas || status === "cursando" || status === "aprobada";

  // Check if blocked only because correlativas are cursando (not missing entirely)
  const missingCorrelativas = materia.correlativas.filter((nro) => !aprobadas.has(nro));
  const allMissingAreCursando = status === "bloqueada"
    && missingCorrelativas.length > 0
    && missingCorrelativas.every((nro) => cursando.has(nro));
  const missingCursandoNames = allMissingAreCursando
    ? missingCorrelativas.map((nro) => carrera.materias.find((m) => m.nro === nro)?.nombre).filter(Boolean) as string[]
    : [];

  const hasAprobadaDependent = status === "aprobada" && desbloquea.some(
    (m) => aprobadas.has(m.nro) || cursando.has(m.nro)
  );
  const dependentesAprobadas = status === "aprobada"
    ? desbloquea.filter((m) => aprobadas.has(m.nro) || cursando.has(m.nro)).map((m) => m.nombre)
    : [];

  const handleCursando = () => {
    toggleCursando(materia.nro);
  };

  const handleCursandoConPermiso = () => {
    const nombres = missingCursandoNames.join(", ");
    const ok = window.confirm(
      `${materia.nombre} depende de ${nombres} que todavia estas cursando.\n\n¿Tenes permiso de la universidad para cursarlas en simultaneo?`
    );
    if (ok) {
      toggleCursando(materia.nro);
    }
  };

  const handleAprobada = () => {
    if (status !== "aprobada") {
      toggleAprobada(materia.nro);
      setNota(materia.nro, "AP");
    } else {
      toggleAprobada(materia.nro);
    }
  };

  /* ── Shared content ── */
  const content = (
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
        <button
          onClick={allMissingAreCursando ? handleCursandoConPermiso : handleCursando}
          className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-colors border ${
            status === "cursando"
              ? mode === "dark"
                ? "bg-yellow-900/40 text-yellow-400 border-yellow-700 hover:bg-yellow-900/60"
                : "bg-yellow-100 text-yellow-700 border-yellow-400 hover:bg-yellow-200"
              : canCursar || allMissingAreCursando
                ? mode === "dark"
                  ? "bg-yellow-900/20 text-yellow-500 border-yellow-800 hover:bg-yellow-900/40"
                  : "bg-yellow-50 text-yellow-600 border-yellow-300 hover:bg-yellow-100"
                : mode === "dark"
                  ? "bg-slate-800 text-slate-500 border-slate-600 cursor-not-allowed"
                  : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
          }`}
          disabled={!canCursar && !allMissingAreCursando}
        >
          {status === "cursando"
            ? "\u25CF Cursando \u2014 click para desmarcar"
            : allMissingAreCursando
              ? "Cursar en simultaneo (con permiso)"
              : canCursar
                ? "Marcar como cursando"
                : "No disponible"}
        </button>

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
          disabled={hasAprobadaDependent || !canAprobar}
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

      {/* Full chain toggle */}
      <button
        onClick={toggleFullChain}
        className="w-full py-2 px-3 rounded-lg text-xs font-semibold transition-colors border flex items-center gap-2 mb-4"
        style={{
          backgroundColor: fullChain
            ? mode === "dark" ? "rgba(14,165,233,0.15)" : "rgba(14,165,233,0.1)"
            : mode === "dark" ? "#1e293b" : "#f8fafc",
          borderColor: fullChain
            ? "#0ea5e9"
            : mode === "dark" ? "#334155" : "#e2e8f0",
          color: fullChain
            ? "#0ea5e9"
            : surface.textSecondary,
        }}
      >
        <span style={{ fontSize: 14 }}>{fullChain ? "\u25C9" : "\u25CB"}</span>
        {fullChain ? "Cadena completa activada" : "Ver cadena completa"}
      </button>

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

      {/* Aplazo: queda registrado hasta aprobar la materia, y convive con
          "cursando" cuando la estas recursando. */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: surface.textSecondary }}>
          Aplazo
        </h4>
        <div className="flex flex-wrap gap-1.5 items-center">
          {NOTA_APLAZO_OPTIONS.map((n) => {
            const isActive = notaAplazo === n;
            return (
              <button
                key={n}
                onClick={() => (isActive ? quitarAplazo(materia.nro) : setAplazo(materia.nro, n))}
                disabled={estaAprobada}
                className="px-2.5 py-1 rounded text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: isActive
                    ? "#dc2626"
                    : mode === "dark" ? "#1e293b" : "#f1f5f9",
                  color: isActive ? "#fff" : mode === "dark" ? "#94a3b8" : "#64748b",
                  borderColor: isActive
                    ? "transparent"
                    : mode === "dark" ? "#334155" : "#e2e8f0",
                }}
                title={
                  estaAprobada
                    ? "La materia ya esta aprobada"
                    : isActive
                      ? "Quitar el aplazo"
                      : `Marcar aplazo con ${n}`
                }
              >
                {n}
              </button>
            );
          })}
          {notaAplazo !== undefined && (
            <button
              onClick={() => quitarAplazo(materia.nro)}
              className="text-[11px] underline ml-1"
              style={{ color: surface.textSecondary }}
            >
              quitar
            </button>
          )}
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: surface.textSecondary }}>
          {estaAprobada
            ? "La materia ya está aprobada: no se le puede cargar un aplazo."
            : notaAplazo !== undefined
              ? "Queda registrado aunque la vuelvas a cursar, y cuenta en el promedio."
              : "Si te aplazaron, marcá la nota. Podés seguir cursándola igual."}
        </p>
      </div>

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

      {/* Los datos salen de los PDFs oficiales, pero el parseo puede fallar:
          este link arma el mail con la materia y sus correlativas ya cargadas. */}
      <div className="mt-5 pt-3" style={{ borderTop: `1px solid ${surface.panelBorder}` }}>
        <a
          href={mailtoReporte(carrera, materia, correlativasNombres)}
          className="text-[11px] hover:underline"
          style={{ color: surface.textSecondary }}
        >
          ¿Hay un error en esta materia? Avisame →
        </a>
      </div>
    </div>
  );

  /* ── Mobile: bottom sheet with swipe-to-dismiss ── */
  if (isMobile) {
    return <MobileSheet surface={surface} onClose={() => selectMateria(null)}>{content}</MobileSheet>;
  }

  /* ── Desktop: right sidebar ── */
  return (
    <div
      className="absolute top-0 right-0 w-80 h-full shadow-lg z-20 overflow-y-auto"
      style={{
        backgroundColor: surface.panel,
        borderLeft: `1px solid ${surface.panelBorder}`,
      }}
    >
      {content}
    </div>
  );
}

/* ── Mobile bottom sheet with swipe-to-dismiss ── */

interface MobileSheetProps {
  surface: { panel: string; panelBorder: string; textSecondary: string };
  onClose: () => void;
  children: React.ReactNode;
}

function MobileSheet({ surface, onClose, children }: MobileSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [entered, setEntered] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only allow swipe dismiss when scrolled to top
    if (sheetRef.current && sheetRef.current.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      setDragY(delta);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragY > 100) {
      onClose();
    } else {
      setDragY(0);
    }
  }, [isDragging, dragY, onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-20"
        style={{
          backgroundColor: `rgba(0,0,0,${Math.max(0.02, 0.15 - dragY / 600)})`,
          backdropFilter: "blur(2px)",
        }}
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl shadow-2xl overflow-y-auto"
        style={{
          maxHeight: "60vh",
          backgroundColor: surface.panel,
          borderTop: `1px solid ${surface.panelBorder}`,
          transform: entered ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? "none" : "transform 0.2s ease-out",
          animation: entered ? undefined : "slideUp 0.2s ease-out",
        }}
        onAnimationEnd={() => setEntered(true)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex justify-center pt-2 pb-1 cursor-grab">
          <div
            className="w-10 h-1 rounded-full"
            style={{ backgroundColor: surface.textSecondary, opacity: 0.4 }}
          />
        </div>
        {children}
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
