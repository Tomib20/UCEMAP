import { SURFACE } from "@/config/theme";
import { useThemeStore } from "@/store/useThemeStore";

interface TourProps {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
}

interface Feature {
  icon: string;
  title: string;
  desc: string;
  /** Mostrar el item solo en una plataforma (si no, en ambas). */
  only?: "mobile" | "desktop";
}

const FEATURES: Feature[] = [
  {
    icon: "⚡",
    title: "Cargá todo de una",
    desc: "Copiá la página de Notas oficiales del sistema de UCEMA y pegala en \"Importar mis notas\": se marcan solas tus materias con su nota.",
  },
  {
    icon: "👆",
    title: "Tocá una materia",
    desc: "Ves de qué depende y qué habilita. Tocá de nuevo para marcarla como cursando o aprobada, y ponerle nota.",
  },
  {
    icon: "🔵",
    title: "¿Qué puedo cursar?",
    desc: "Ilumina solo las materias que ya podés anotarte ahora, con un halo celeste.",
  },
  {
    icon: "✨",
    title: "Electivas y talleres",
    desc: "Se muestran aparte con el botón de Electivas: primero las que estás haciendo, después todas las del plan.",
  },
  {
    icon: "🧭",
    title: "Moverte por el mapa",
    desc: "Arrastrá para desplazarte, usá la rueda para el zoom y el minimapa de abajo a la derecha para ubicarte.",
    only: "desktop",
  },
  {
    icon: "🤏",
    title: "Moverte por el mapa",
    desc: "Arrastrá con un dedo para desplazarte y pellizcá con dos para hacer zoom.",
    only: "mobile",
  },
  {
    icon: "🔍",
    title: "Buscar y tema",
    desc: "Buscá una materia con la lupa (Ctrl/⌘ + K) y cambiá entre modo claro y oscuro.",
  },
  {
    icon: "☁️",
    title: "Guardar tu progreso",
    desc: "Iniciá sesión con Google y tu mapa se guarda solo en tu propio Drive, privado, para abrirlo desde cualquier dispositivo.",
  },
];

export function Tour({ open, onClose, isMobile }: TourProps) {
  const mode = useThemeStore((s) => s.mode);
  const surface = SURFACE[mode];

  if (!open) return null;

  const features = FEATURES.filter((f) => !f.only || f.only === (isMobile ? "mobile" : "desktop"));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl w-full overflow-y-auto"
        style={{
          maxWidth: 520,
          maxHeight: "85vh",
          backgroundColor: surface.panel,
          border: `1px solid ${surface.panelBorder}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-lg font-bold" style={{ color: surface.textPrimary }}>
              Cómo usar UCEMA Map
            </h2>
            <button
              onClick={onClose}
              className="text-xl leading-none hover:opacity-70"
              style={{ color: surface.textSecondary }}
              aria-label="Cerrar"
            >
              &times;
            </button>
          </div>
          <p className="text-xs mb-4" style={{ color: surface.textSecondary }}>
            Un repaso rápido de lo que podés hacer.
          </p>

          <ul className="flex flex-col gap-3">
            {features.map((f) => (
              <li key={f.title + f.icon} className="flex gap-3">
                <span className="text-lg leading-none shrink-0" aria-hidden>
                  {f.icon}
                </span>
                <div>
                  <div className="text-sm font-semibold" style={{ color: surface.textPrimary }}>
                    {f.title}
                  </div>
                  <div className="text-xs" style={{ color: surface.textSecondary }}>
                    {f.desc}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <button
            onClick={onClose}
            className="w-full mt-5 py-2.5 rounded-lg text-sm font-bold bg-navy text-white hover:bg-navy-light transition-colors"
          >
            ¡Empezar!
          </button>
          <p className="text-[10px] text-center mt-2" style={{ color: surface.textSecondary }}>
            Podés volver a ver esto con el botón <strong>?</strong> del mapa.
          </p>
        </div>
      </div>
    </div>
  );
}
