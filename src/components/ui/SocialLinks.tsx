import { SURFACE } from "@/config/theme";
import { useThemeStore } from "@/store/useThemeStore";

/**
 * Redes del autor. Dejar en "" las que no se quieran mostrar: cada icono se
 * renderiza solo si tiene URL, asi nunca queda un link roto publicado.
 *
 * GitHub apunta al repo de la app, no al perfil: quien toca ese icono desde el
 * mapa esta buscando el codigo de esto, no la lista de proyectos del autor.
 */
const REDES = {
  instagram: "https://www.instagram.com/tomi.bruner/",
  linkedin: "https://www.linkedin.com/in/tomasbruner",
  github: "https://github.com/Tomib20/UCEMAP",
};

const AUTOR = "Tomás Bruner";

interface IconProps {
  size?: number;
}

function IconInstagram({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function IconLinkedIn({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function IconGitHub({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
    </svg>
  );
}

function redesActivas() {
  return [
    { url: REDES.instagram, label: "Instagram", Icono: IconInstagram },
    { url: REDES.linkedin, label: "LinkedIn", Icono: IconLinkedIn },
    {
      url: REDES.github,
      label: "GitHub",
      Icono: IconGitHub,
      // Los otros dos son el perfil del autor; este es el repo de la app, asi
      // que no le sirve el "<autor> en <red>" de los demas.
      titulo: "Ver el codigo de UCEMA Map en GitHub",
    },
  ].filter((r) => r.url !== "");
}

/**
 * `footer`: fila con el nombre del autor, para el pie de la home.
 * `map`: isla horizontal en la esquina inferior izquierda del mapa (desktop).
 * `chips`: solo los iconos, para la barra de herramientas del mapa en mobile.
 */
export function SocialLinks({ variant = "footer" }: { variant?: "footer" | "map" | "chips" }) {
  const mode = useThemeStore((s) => s.mode);
  const surface = SURFACE[mode];
  const redes = redesActivas();

  if (redes.length === 0) return null;

  const panelBg = mode === "dark" ? "rgba(30,41,59,0.92)" : "rgba(255,255,255,0.95)";

  const iconos = (
    <>
      {redes.map(({ url, label, Icono, titulo }) => (
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={titulo ?? `${AUTOR} en ${label}`}
          aria-label={titulo ?? `${AUTOR} en ${label}`}
          className="w-7 h-7 rounded-lg flex items-center justify-center border transition-opacity hover:opacity-70 shrink-0"
          style={{
            borderColor: surface.panelBorder,
            color: surface.textSecondary,
            backgroundColor: variant === "chips" ? panelBg : "transparent",
          }}
        >
          <Icono size={15} />
        </a>
      ))}
    </>
  );

  if (variant === "map") {
    // Seccion final del panel de la leyenda: separador + iconos centrados.
    return (
      <>
        <div className="my-2" style={{ borderTop: `1px solid ${surface.panelBorder}` }} />
        <div className="flex items-center justify-center gap-2" title={`UCEMA Map, por ${AUTOR}`}>
          {iconos}
        </div>
      </>
    );
  }

  if (variant === "chips") {
    return (
      <>
        <div className="shrink-0 w-px h-5 mx-0.5" style={{ backgroundColor: surface.panelBorder }} />
        {iconos}
      </>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3 mt-3">
      <span className="text-[11px]" style={{ color: surface.textSecondary }}>
        Por {AUTOR}
      </span>
      <div className="flex items-center gap-2">{iconos}</div>
    </div>
  );
}
