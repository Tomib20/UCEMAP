import { useEffect, useState } from "react";
import { SURFACE } from "@/config/theme";
import { useThemeStore } from "@/store/useThemeStore";
import {
  adoptarProgresoLegacy,
  descartarProgresoLegacy,
  leerProgresoLegacy,
} from "@/store/useProgressStore";
import carrerasIndex from "../../../data/carreras/index.json";

/**
 * Las versiones anteriores dejaban el mapa guardado en el navegador. Antes de
 * mostrar ese progreso preguntamos: aparecer con materias marcadas que uno no
 * cargo en esta sesion desconcierta, sobre todo en una compu compartida.
 *
 * Se muestra una sola vez por sesion: al conservar, el mapa pasa a la sesion
 * actual; al descartar, se borra la copia vieja y no se vuelve a preguntar.
 */
export function RecuperarProgreso() {
  const mode = useThemeStore((s) => s.mode);
  const surface = SURFACE[mode];
  const [legacy, setLegacy] = useState<ReturnType<typeof leerProgresoLegacy>>(null);

  useEffect(() => {
    setLegacy(leerProgresoLegacy());
  }, []);

  if (!legacy) return null;

  const porCarrera = Object.entries(legacy.aprobadas ?? {})
    .filter(([, nros]) => nros.length > 0)
    .map(([id, nros]) => ({
      nombre: carrerasIndex.carreras.find((c) => c.id === id)?.nombre ?? id,
      cantidad: nros.length,
    }));

  const conservar = () => {
    adoptarProgresoLegacy(legacy);
    setLegacy(null);
  };

  const descartar = () => {
    descartarProgresoLegacy();
    setLegacy(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
    >
      <div
        className="rounded-2xl shadow-2xl w-full p-5"
        style={{
          maxWidth: 460,
          backgroundColor: surface.panel,
          border: `1px solid ${surface.panelBorder}`,
        }}
      >
        <h2 className="text-lg font-bold mb-1" style={{ color: surface.textPrimary }}>
          Encontramos un mapa guardado
        </h2>
        <p className="text-xs mb-3" style={{ color: surface.textSecondary }}>
          Quedó guardado en este navegador de una versión anterior de UCEMA Map.
        </p>

        <ul className="text-sm mb-4 flex flex-col gap-1">
          {porCarrera.map((c) => (
            <li key={c.nombre} style={{ color: surface.textPrimary }}>
              <strong>{c.cantidad}</strong> materia{c.cantidad !== 1 ? "s" : ""} aprobada
              {c.cantidad !== 1 ? "s" : ""} en {c.nombre}
            </li>
          ))}
        </ul>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={conservar}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-navy text-white hover:bg-navy-light transition-colors"
          >
            Conservar mi mapa
          </button>
          <button
            onClick={descartar}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors"
            style={{
              borderColor: surface.panelBorder,
              color: surface.textSecondary,
              backgroundColor: "transparent",
            }}
          >
            Empezar de cero
          </button>
        </div>
        <p className="text-[10px] mt-3" style={{ color: surface.textSecondary }}>
          Si empezás de cero, ese mapa se borra de este navegador. Iniciá sesión con Google para
          que tu progreso quede guardado en tu Drive.
        </p>
      </div>
    </div>
  );
}
