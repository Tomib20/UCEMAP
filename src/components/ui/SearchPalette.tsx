import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { Carrera, Materia, MateriaStatus } from "@/types/carrera";
import { getMateriaStatus } from "@/utils/materiaStatus";
import {
  useProgressStore,
  selectAprobadasArray,
  selectCursandoArray,
} from "@/store/useProgressStore";
import { useThemeStore } from "@/store/useThemeStore";
import { SURFACE } from "@/config/theme";

interface SearchPaletteProps {
  carrera: Carrera;
  isOpen: boolean;
  onClose: () => void;
}

/** Remove diacritics and lowercase for fuzzy matching */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const STATUS_LABEL: Record<MateriaStatus, string> = {
  aprobada: "Aprobada",
  cursando: "Cursando",
  disponible: "Disponible",
  bloqueada: "Bloqueada",
};

const STATUS_COLORS: Record<MateriaStatus, string> = {
  aprobada: "#16a34a",
  cursando: "#ca8a04",
  disponible: "#3b82f6",
  bloqueada: "#94a3b8",
};

export function SearchPalette({ carrera, isOpen, onClose }: SearchPaletteProps) {
  const mode = useThemeStore((s) => s.mode);
  const surface = SURFACE[mode];
  const aprobadasArr = useProgressStore(selectAprobadasArray);
  const cursandoArr = useProgressStore(selectCursandoArray);
  const selectMateria = useProgressStore((s) => s.selectMateria);
  const requestCenterOn = useProgressStore((s) => s.requestCenterOn);

  const aprobadas = useMemo(() => new Set(aprobadasArr), [aprobadasArr]);
  const cursando = useMemo(() => new Set(cursandoArr), [cursandoArr]);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      // Small delay for DOM to be ready
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Filter materias
  const results = useMemo(() => {
    if (!query.trim()) return carrera.materias.slice(0, 12);
    const q = normalize(query.trim());
    const matches: { materia: Materia; startsMatch: boolean }[] = [];
    for (const m of carrera.materias) {
      const name = normalize(m.nombre);
      if (name.includes(q)) {
        matches.push({ materia: m, startsMatch: name.startsWith(q) });
      }
    }
    // Sort: starts-with first, then alphabetical
    matches.sort((a, b) => {
      if (a.startsMatch !== b.startsMatch) return a.startsMatch ? -1 : 1;
      return a.materia.nombre.localeCompare(b.materia.nombre);
    });
    return matches.map((m) => m.materia).slice(0, 12);
  }, [carrera.materias, query]);

  // Clamp index when results change
  useEffect(() => {
    setSelectedIndex((prev) => Math.min(prev, Math.max(0, results.length - 1)));
  }, [results.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (materia: Materia) => {
      selectMateria(materia.nro);
      requestCenterOn(materia.nro);
      onClose();
    },
    [selectMateria, requestCenterOn, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [results, selectedIndex, handleSelect, onClose]
  );

  if (!isOpen) return null;

  const isMac =
    typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: mode === "dark" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.3)" }}
      />

      {/* Palette */}
      <div
        className="relative w-full max-w-md mx-4 rounded-xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: surface.panel,
          border: `1px solid ${surface.panelBorder}`,
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: `1px solid ${surface.panelBorder}` }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={surface.textSecondary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Buscar materia..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: surface.textPrimary }}
          />
          <kbd
            className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded border"
            style={{
              color: surface.textSecondary,
              borderColor: surface.panelBorder,
              backgroundColor: mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 ? (
            <div
              className="px-4 py-6 text-center text-sm"
              style={{ color: surface.textSecondary }}
            >
              No se encontraron materias
            </div>
          ) : (
            results.map((materia, i) => {
              const status = getMateriaStatus(materia, aprobadas, cursando);
              const isSelected = i === selectedIndex;
              return (
                <button
                  key={materia.nro}
                  onClick={() => handleSelect(materia)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: isSelected
                      ? mode === "dark"
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.05)"
                      : "transparent",
                  }}
                >
                  {/* Status dot */}
                  <span
                    className="shrink-0 w-2 h-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[status] }}
                  />
                  {/* Name + metadata */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium truncate"
                      style={{ color: surface.textPrimary }}
                    >
                      {materia.nombre}
                    </div>
                    <div
                      className="text-[11px] mt-0.5"
                      style={{ color: surface.textSecondary }}
                    >
                      {materia.anio}&deg; A&ntilde;o &middot; C{materia.cuatrimestre} &middot;{" "}
                      {materia.grupo}
                    </div>
                  </div>
                  {/* Status badge */}
                  <span
                    className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      color: STATUS_COLORS[status],
                      backgroundColor:
                        mode === "dark"
                          ? `${STATUS_COLORS[status]}20`
                          : `${STATUS_COLORS[status]}15`,
                    }}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div
          className="px-4 py-2 text-[10px] flex items-center gap-3"
          style={{
            color: surface.textSecondary,
            borderTop: `1px solid ${surface.panelBorder}`,
          }}
        >
          <span>
            <kbd className="font-mono">↑↓</kbd> navegar
          </span>
          <span>
            <kbd className="font-mono">↵</kbd> seleccionar
          </span>
          <span>
            <kbd className="font-mono">esc</kbd> cerrar
          </span>
          <span className="ml-auto opacity-60">
            {isMac ? "⌘" : "Ctrl"}+K para buscar
          </span>
        </div>
      </div>
    </div>
  );
}
