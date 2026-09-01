import { useMemo, useState } from "react";
import type { Carrera } from "@/types/carrera";
import { SURFACE } from "@/config/theme";
import { useThemeStore } from "@/store/useThemeStore";
import { useProgressStore } from "@/store/useProgressStore";
import { aProgreso, importarNotas } from "@/utils/importarNotas";

interface ImportarNotasProps {
  carrera: Carrera;
  open: boolean;
  onClose: () => void;
}

/**
 * Carga el mapa de una sola vez desde el listado de "Notas oficiales" del
 * sistema de alumnos: el usuario copia esa pagina entera y la pega aca.
 *
 * Es la forma mas rapida de empezar a usar la app: marcar 20 o 30 materias a
 * mano es la friccion mas grande que tiene el mapa.
 */
export function ImportarNotas({ carrera, open, onClose }: ImportarNotasProps) {
  const mode = useThemeStore((s) => s.mode);
  const surface = SURFACE[mode];
  const importarProgreso = useProgressStore((s) => s.importarProgreso);
  const vaciarCarrera = useProgressStore((s) => s.vaciarCarrera);
  const [texto, setTexto] = useState("");
  const [listo, setListo] = useState(false);

  const resultado = useMemo(
    () => (texto.trim() ? importarNotas(texto, carrera) : null),
    [texto, carrera]
  );

  const aplazos = resultado?.reconocidas.filter((r) => r.esAplazo) ?? [];
  const aprobadas = resultado?.reconocidas.filter((r) => !r.esAplazo) ?? [];

  if (!open) return null;

  const cerrar = () => {
    setTexto("");
    setListo(false);
    onClose();
  };

  const confirmar = () => {
    if (!resultado || resultado.reconocidas.length === 0) return;
    importarProgreso(aProgreso(resultado.reconocidas));
    setListo(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={cerrar}
    >
      <div
        className="rounded-2xl shadow-2xl w-full overflow-y-auto"
        style={{
          maxWidth: 560,
          maxHeight: "88vh",
          backgroundColor: surface.panel,
          border: `1px solid ${surface.panelBorder}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-lg font-bold" style={{ color: surface.textPrimary }}>
              Importar tus notas
            </h2>
            <button
              onClick={cerrar}
              className="text-xl leading-none hover:opacity-70"
              style={{ color: surface.textSecondary }}
              aria-label="Cerrar"
            >
              &times;
            </button>
          </div>

          {listo ? (
            <div className="py-6 text-center">
              <div className="text-3xl mb-2" aria-hidden>✅</div>
              <p className="text-sm font-semibold mb-1" style={{ color: surface.textPrimary }}>
                Listo, tu mapa quedó cargado
              </p>
              <p className="text-xs mb-5" style={{ color: surface.textSecondary }}>
                {aprobadas.length} materia{aprobadas.length !== 1 ? "s" : ""} aprobada
                {aprobadas.length !== 1 ? "s" : ""}
                {aplazos.length > 0 && ` y ${aplazos.length} aplazo${aplazos.length !== 1 ? "s" : ""}`}.
              </p>
              <button
                onClick={cerrar}
                className="px-5 py-2 rounded-lg text-sm font-bold bg-navy text-white hover:bg-navy-light transition-colors"
              >
                Ver mi mapa
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs mb-3" style={{ color: surface.textSecondary }}>
                Entrá a <strong>Notas oficiales</strong> en el sistema de alumnos de UCEMA,
                seleccioná toda la página (Ctrl+A), copiala (Ctrl+C) y pegala acá abajo. Se cargan
                solas las materias aprobadas con su nota.
              </p>

              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={"Código\tMateria\tNota\tFecha\n1022\tProgramación III\t10\t17/07/2026\n..."}
                rows={8}
                autoFocus
                className="w-full text-xs rounded-lg p-3 border outline-none font-mono resize-y"
                style={{
                  backgroundColor: mode === "dark" ? "#0f172a" : "#f8fafc",
                  borderColor: surface.panelBorder,
                  color: surface.textPrimary,
                }}
              />

              {resultado && (
                <div className="mt-3 text-xs" style={{ color: surface.textSecondary }}>
                  {resultado.vacio ? (
                    <p style={{ color: mode === "dark" ? "#f87171" : "#dc2626" }}>
                      No encontré ninguna nota en lo que pegaste. Asegurate de copiar la página de
                      Notas oficiales completa.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <p>
                        <strong style={{ color: "#16a34a" }}>{aprobadas.length}</strong> materias
                        aprobadas
                        {aplazos.length > 0 && (
                          <>
                            {" · "}
                            <strong style={{ color: "#dc2626" }}>{aplazos.length}</strong> aplazo
                            {aplazos.length !== 1 ? "s" : ""}
                          </>
                        )}
                      </p>
                      {resultado.desconocidas.length > 0 && (
                        <p>
                          {resultado.desconocidas.length}{" "}
                          {resultado.desconocidas.length === 1 ? "materia del listado no está" : "materias del listado no están"}{" "}
                          en el plan de {carrera.nombre}: {resultado.desconocidas.slice(0, 3).map((d) => d.nombre).join(", ")}
                          {resultado.desconocidas.length > 3 && "…"}. ¿Estás en la carrera correcta?
                        </p>
                      )}
                      <p style={{ color: mode === "dark" ? "#fbbf24" : "#b45309" }}>
                        Esto reemplaza lo que tengas marcado en esta carrera.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={confirmar}
                  disabled={!resultado || resultado.reconocidas.length === 0}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-navy text-white hover:bg-navy-light transition-colors disabled:opacity-40"
                >
                  Importar {resultado?.reconocidas.length ? `(${resultado.reconocidas.length})` : ""}
                </button>
                <button
                  onClick={cerrar}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold border"
                  style={{ borderColor: surface.panelBorder, color: surface.textSecondary }}
                >
                  Cancelar
                </button>
              </div>

              {/* Sin esto, quien queda con datos que no reconoce no tiene forma
                  de borrarlos desde la aplicacion. */}
              <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${surface.panelBorder}` }}>
                <button
                  onClick={() => {
                    const ok = window.confirm(
                      `Se va a borrar todo lo que tengas marcado en ${carrera.nombre}. ¿Seguro?`
                    );
                    if (ok) {
                      vaciarCarrera();
                      cerrar();
                    }
                  }}
                  className="text-[11px] hover:underline"
                  style={{ color: mode === "dark" ? "#f87171" : "#dc2626" }}
                >
                  Vaciar mi mapa de {carrera.nombre}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
