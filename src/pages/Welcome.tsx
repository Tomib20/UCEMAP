import { Link, useNavigate } from "react-router-dom";
import { BRANDING, SURFACE } from "@/config/theme";
import { useThemeStore } from "@/store/useThemeStore";
import { useUserStore } from "@/store/useUserStore";
import { useProgressStore } from "@/store/useProgressStore";
import { isSyncConfigured } from "@/lib/googleDrive";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Logo, GoogleG } from "@/components/ui/Logo";
import { SocialLinks } from "@/components/ui/SocialLinks";
import carrerasIndex from "../../data/carreras/index.json";

/** Color de acento por carrera, para que cada tarjeta tenga identidad propia. */
const ACCENTS: Record<string, string> = {
  "ingenieria-informatica": "#2563eb",
  "ingenieria-inteligencia-artificial": "#0ea5e9",
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
      // Entramos a la ultima carrera que el usuario tenia abierta en otro
      // dispositivo; si nunca guardo ninguna, a la que ya estaba en el store.
      const destino =
        useUserStore.getState().carreraEnDrive ?? useProgressStore.getState().carreraId;
      navigate(`/carrera/${destino}`);
    }
  };

  const accent = (id: string) => ACCENTS[id] ?? ACCENT_FALLBACK;

  return (
    <div
      className="h-full w-full overflow-y-auto overscroll-contain"
      style={{ backgroundColor: surface.bg, WebkitOverflowScrolling: "touch" }}
    >
      {/* Barra superior */}
      <header className="flex items-center justify-between px-5 sm:px-8 py-4">
        <div className="flex items-center gap-3">
          <Logo size={38} />
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
            className="mt-5 text-sm font-semibold rounded-lg px-4 py-2.5 inline-flex items-center gap-2.5 border transition-colors disabled:opacity-50 hover:bg-slate-100"
            style={{ backgroundColor: "#ffffff", color: "#1f1f1f", borderColor: "#dadce0" }}
          >
            {remembered?.picture ? (
              <img src={remembered.picture} alt="" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <GoogleG size={17} />
            )}
            {status === "loading"
              ? "Conectando con Google..."
              : remembered
                ? `Continuar como ${remembered.name.split(" ")[0]}`
                : "Iniciar sesión con Google"}
          </button>
        )}
        {errorMsg && status === "error" && (
          <p className="mt-2 text-xs" style={{ color: "#dc2626" }}>
            No pudimos entrar: {errorMsg}{" "}
            <Link to="/diagnostico" className="underline font-semibold">
              Ver por qué
            </Link>
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

        <div className="text-center text-[11px] mt-8" style={{ color: surface.textSecondary }}>
          <p>
            Hecho por un alumno de la UCEMA, con los planes de estudio oficiales. Proyecto no oficial,
            sin relación con la universidad.
          </p>
          <p className="mt-1">
            <Link to="/privacidad" className="underline hover:opacity-70">
              Privacidad
            </Link>
            {" · "}
            <Link to="/terminos" className="underline hover:opacity-70">
              Condiciones
            </Link>
          </p>
          <SocialLinks />
        </div>
      </section>
    </div>
  );
}
