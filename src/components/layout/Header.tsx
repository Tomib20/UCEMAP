import { BRANDING } from "@/config/theme";
import type { Carrera } from "@/types/carrera";
import { useThemeStore } from "@/store/useThemeStore";

interface HeaderProps {
  carrera: Carrera;
}

export function Header({ carrera }: HeaderProps) {
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);

  return (
    <header className="bg-navy text-white px-6 py-2.5 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight leading-tight">
            {BRANDING.name}
          </h1>
          <p className="text-[11px] text-slate-300">{BRANDING.university}</p>
        </div>
        <div className="h-8 w-px bg-white/20" />
        <div>
          <h2 className="text-sm font-semibold leading-tight">{carrera.nombre}</h2>
          <p className="text-[11px] text-slate-300">
            Plan {carrera.plan} &middot; {carrera.titulo}
          </p>
        </div>
      </div>
      <button
        onClick={toggle}
        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
        title={mode === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      >
        {mode === "light" ? "\u263E" : "\u2600"}
      </button>
    </header>
  );
}
