/**
 * Marca de UCEMA Map: tres materias encadenadas que suben. Dice las dos cosas
 * que hace la app — correlatividad (los nodos conectados) y avance (la diagonal
 * ascendente) — sobre el bordo institucional de la universidad.
 *
 * Si se cambia el simbolo hay que tocar los dos lados: este componente (header,
 * home y paginas legales) y scripts/generate-icons.mjs, que genera los PNG.
 */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className="shrink-0">
      <rect width="100" height="100" rx="22" fill="#940028" />
      <path
        d="M28 72L50 50l22-22"
        fill="none"
        stroke="#ffffff"
        strokeWidth="8"
        strokeLinecap="round"
        opacity=".55"
      />
      <circle cx="28" cy="72" r="11" fill="#ffffff" />
      <circle cx="50" cy="50" r="11" fill="#ffffff" />
      <circle cx="72" cy="28" r="11" fill="#ffffff" />
    </svg>
  );
}

/**
 * Logo "G" oficial de Google, para el boton de inicio de sesion.
 *
 * Google pide que su boton use el logo a color sobre fondo claro y el texto
 * "Iniciar sesion con Google", asi que el boton va en blanco aunque el header
 * sea navy.
 */
export function GoogleG({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.63h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3.01h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3.01c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.11C3.25 21.3 7.31 24 12 24z"
      />
      <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.27a12 12 0 0 0 0 10.76z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.62l4 3.11C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}
