import type { Materia } from "@/types/carrera";
import { getMateriaStatus } from "@/utils/materiaStatus";
import { useProgressStore } from "@/store/useProgressStore";
import { useProgresoEfectivo } from "@/hooks/useProgresoEfectivo";
import { useThemeStore } from "@/store/useThemeStore";
import { SURFACE } from "@/config/theme";

export interface ContextMenuState {
  materia: Materia;
  x: number;
  y: number;
}

interface ContextMenuProps {
  menu: ContextMenuState;
  onClose: () => void;
}

export function ContextMenu({ menu, onClose }: ContextMenuProps) {
  const mode = useThemeStore((s) => s.mode);
  const surface = SURFACE[mode];
  const progreso = useProgresoEfectivo();
  const { aprobadas, cursando } = progreso;
  const toggleAprobada = useProgressStore((s) => s.toggleAprobada);
  const toggleCursando = useProgressStore((s) => s.toggleCursando);
  const setNota = useProgressStore((s) => s.setNota);
  const { materia, x, y } = menu;
  const status = getMateriaStatus(materia, aprobadas, cursando);
  // Lo que viene de otra carrera se edita alla: aca no hay nada que tocar.
  const otraCarrera = progreso.origenDeOtraCarrera.get(materia.nro);

  const items: { label: string; action: () => void; disabled?: boolean; color?: string }[] = [];

  if (otraCarrera) {
    items.push({
      label: `Cursada en ${otraCarrera}`,
      action: () => {},
      disabled: true,
    });
  } else if (status === "aprobada") {
    items.push({
      label: "Desmarcar aprobada",
      action: () => { toggleAprobada(materia.nro); onClose(); },
      color: "#ef4444",
    });
  } else if (status === "cursando") {
    items.push({
      label: "Marcar aprobada",
      action: () => { toggleAprobada(materia.nro); setNota(materia.nro, "AP"); onClose(); },
      color: "#16a34a",
    });
    items.push({
      label: "Desmarcar cursando",
      action: () => { toggleCursando(materia.nro); onClose(); },
      color: "#ef4444",
    });
  } else if (status === "disponible") {
    items.push({
      label: "Marcar aprobada",
      action: () => { toggleAprobada(materia.nro); setNota(materia.nro, "AP"); onClose(); },
      color: "#16a34a",
    });
    items.push({
      label: "Marcar cursando",
      action: () => { toggleCursando(materia.nro); onClose(); },
      color: "#ca8a04",
    });
  } else {
    items.push({
      label: "Bloqueada",
      action: () => {},
      disabled: true,
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 rounded-lg shadow-xl py-1 min-w-[160px]"
        style={{
          left: x,
          top: y,
          backgroundColor: mode === "dark" ? "#1e293b" : "#ffffff",
          border: `1px solid ${surface.panelBorder}`,
        }}
      >
        <div
          className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider border-b"
          style={{ color: surface.textSecondary, borderColor: surface.panelBorder }}
        >
          {materia.nombre}
        </div>
        {items.map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            disabled={item.disabled}
            className="w-full text-left px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: item.disabled ? surface.textSecondary : (item.color ?? surface.textPrimary) }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
