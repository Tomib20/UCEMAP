import { useNavigate } from "react-router-dom";
import { BRANDING, SURFACE } from "@/config/theme";
import { useThemeStore } from "@/store/useThemeStore";
import { useUserStore } from "@/store/useUserStore";
import { useProgressStore } from "@/store/useProgressStore";
import { isSyncConfigured } from "@/lib/googleDrive";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import carrerasIndex from "../../data/carreras/index.json";

/** Color de acento por carrera, para que cada tarjeta tenga identidad propia. */
const ACCENTS: Record<string, string> = {
  "ingenieria-informatica": "#2563eb",
  abogacia: "#7c3aed",
  actuario: "#0891b2",
  "business-administration": "#0d9488",
  "contador-publico": "#b45309",
  "licenciatura-ciencias-politicas": "#be123c",
  "licenciatura-administracion": "#4f46e5",
  "licenciatura-economia": "#059669",
  "licenciatura-finanzas": "#c2410c",
  "licenciatura-marketing": "#db2777",
  "licenciatura-negocios-digitales": "#6d28d9",
  "licenciatura-relaciones-internacionales": "#0284c7",
};

const ACCENT_FALLBACK = "#64748b";

/** Logo: las tres materias encadenadas del favicon. */
function Mark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className="shrink-0">
      <rect width="100" height="100" rx="22" fill="#1a2744" />
      <g stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round">
        <line x1="26" y1="31" x2="50" y2="43" />
        <line x1="50" y1="57" x2="74" y2="69" />
      </g>
      <rect x="9" y="17" width="34" height="15" rx="5" fill="#86efac" />
      <rect x="33" y="43" width="34" height="15" rx="5" fill="#bfdbfe" />
      <rect x="57" y="69" width="34" height="15" rx="5" fill="#fef08a" />
    </svg>
  );
}

/**
 * Pantalla de bienvenida (ruta `/`). Con 12 carreras, entrar directo a una sola
 * es tirar una moneda: acá elegís la tuya. Si ya tenés sesion iniciada, App.tsx
 * ni muestra esta pantalla y va derecho a tu carrera.
 */
export function Welcome() {
  const navigate = useNavigate();
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);
  const surface = SURFACE[mode];
  const carreras = carrerasIndex.carreras;

  const login = useUserStore((s) => s.login);
  const remembered = useUserStore((s) => s.remembered);
  const status = useUserStore((s) => s.status);
  const errorMsg = useUserStore((s) => s.error);
  const { canInstall, promptInstall } = useInstallPrompt();

  const handleLogin = async () => {
    const ok = await login();
    if (ok) {
      // El login ya trajo de Drive la ultima carrera del usuario.
      navigate(`/carrera/${useProgressStore.getState().carreraId}`);
    }
  };

  const accent = (id: string) => ACCENTS[id] ?? ACCENT_FALLBACK;

  return (
    <div className="min-h-screen w-full overflow-y-auto" style={{ backgroundColor: surface.bg }}>
      {/* Barra superior */}
      <header className="flex items-center justify-between px-5 sm:px-8 py-4">
        <div className="flex items-center gap-3">
          <Mark size={38} />
          <div>
            <div className="text-lg font-bold leading-tight" style={{ color: surface.textPrimary }}>
              {BRANDING.name}
            </div>
            <div className="text-[11px]" style={{ color: surface.textSecondary }}>
              {BRANDING.university}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canInstall && (
            <button
              onClick={promptInstall}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-teal hover:bg-teal-light transition-colors text-white"
            >
              Instalar app
            </button>
          )}
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-lg border flex items-center justify-center"
            style={{ borderColor: surface.panelBorder, color: surface.textSecondary, backgroundColor: surface.panel }}
            title={mode === "light" ? "Modo oscuro" : "Modo claro"}
          >
            {mode === "light" ? "☾" : "☀"}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 sm:px-8 pt-6 pb-8 text-center max-w-3xl mx-auto">
        <h1
          className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight"
          style={{ color: surface.textPrimary }}
        >
          Mapeá tu carrera en la UCEMA
        </h1>
        <p className="mt-3 text-sm sm:text-base" style={{ color: surface.textSecondary }}>
          Marcá las materias que aprobaste y mirá al toque qué se te habilita, qué te falta y cómo
          venís con el promedio. Elegí tu carrera para empezar.
        </p>

        {isSyncConfigured() && (
          <button
            onClick={handleLogin}
            disabled={status === "loading"}
            className="mt-5 text-sm font-semibold hover:underline disabled:opacity-50 inline-flex items-center gap-2"
            style={{ color: "#0d9488" }}
          >
            {remembered?.picture && (
              <img src={remembered.picture} alt="" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
            )}
            {status === "loading"
              ? "Conectando con Google..."
              : remembered
                ? `Continuar como ${remembered.name.split(" ")[0]} →`
                : "¿Ya tenés tu mapa guardado? Iniciá sesión con Google →"}
          </button>
        )}
        {errorMsg && status === "error" && (
          <p className="mt-2 text-xs" style={{ color: "#dc2626" }}>
            No pudimos entrar: {errorMsg}
          </p>
        )}
      </section>

      {/* Grilla de carreras */}
      <section className="px-5 sm:px-8 pb-12 max-w-5xl mx-auto">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {carreras.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/carrera/${c.id}`)}
              className="text-left rounded-xl border p-4 transition-transform hover:-translate-y-0.5 hover:shadow-md flex items-center gap-3"
              style={{ backgroundColor: surface.panel, borderColor: surface.panelBorder }}
            >
              <span
                className="w-1.5 h-10 rounded-full shrink-0"
                style={{ backgroundColor: accent(c.id) }}
              />
              <span className="min-w-0">
                <span
                  className="block text-sm font-bold leading-tight"
                  style={{ color: surface.textPrimary }}
                >
                  {c.nombre}
                </span>
                <span className="block text-xs mt-0.5" style={{ color: accent(c.id) }}>
                  Ver mapa →
                </span>
              </span>
            </button>
          ))}
        </div>

        <p className="text-center text-[11px] mt-8" style={{ color: surface.textSecondary }}>
          Hecho por un alumno de la UCEMA, con los planes de estudio oficiales.
        </p>
      </section>
    </div>
  );
}
