import { useState } from "react";
import { BRANDING } from "@/config/theme";
import type { Carrera } from "@/types/carrera";
import { useThemeStore } from "@/store/useThemeStore";
import { useUserStore } from "@/store/useUserStore";

interface CarreraEntry {
  id: string;
  nombre: string;
}

interface HeaderProps {
  carrera: Carrera;
  carreras: CarreraEntry[];
  onCarreraChange: (id: string) => void;
}

export function Header({ carrera, carreras, onCarreraChange }: HeaderProps) {
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);

  const usuario = useUserStore((s) => s.usuario);
  const status = useUserStore((s) => s.status);
  const errorMsg = useUserStore((s) => s.error);
  const isDirty = useUserStore((s) => s.isDirty);
  const login = useUserStore((s) => s.login);
  const logout = useUserStore((s) => s.logout);
  const saveToCloud = useUserStore((s) => s.saveToCloud);

  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  const handleLogin = async () => {
    const ok = await login(input);
    if (ok) {
      setInput("");
      setOpen(false);
    }
  };

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
          {carreras.length > 1 ? (
            <select
              value={carrera.id}
              onChange={(e) => onCarreraChange(e.target.value)}
              className="bg-white/10 text-white text-sm font-semibold rounded-lg px-2 py-1 border border-white/20 cursor-pointer hover:bg-white/20 transition-colors outline-none"
            >
              {carreras.map((c) => (
                <option key={c.id} value={c.id} className="bg-navy text-white">
                  {c.nombre}
                </option>
              ))}
            </select>
          ) : (
            <h2 className="text-sm font-semibold leading-tight">{carrera.nombre}</h2>
          )}
          <p className="text-[11px] text-slate-300 mt-0.5">
            Plan {carrera.plan} &middot; {carrera.titulo}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {usuario ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{usuario}</span>
            <button
              onClick={saveToCloud}
              disabled={!isDirty || status === "syncing"}
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                isDirty
                  ? "bg-emerald-500/80 hover:bg-emerald-500 text-white"
                  : "bg-white/10 text-slate-400"
              } disabled:cursor-default`}
              title={
                status === "syncing"
                  ? "Guardando..."
                  : isDirty
                    ? "Guardar cambios en la nube"
                    : "Sin cambios pendientes"
              }
            >
              {status === "syncing"
                ? "Guardando..."
                : isDirty
                  ? "Guardar"
                  : "Guardado"}
            </button>
            <button
              onClick={logout}
              className="text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="Cerrar sesion"
            >
              Salir
            </button>
          </div>
        ) : open ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLogin();
                if (e.key === "Escape") {
                  setOpen(false);
                  setInput("");
                }
              }}
              placeholder="usuario UCEMA"
              autoFocus
              className="bg-white/10 text-white placeholder-slate-400 text-sm rounded-lg px-2 py-1 border border-white/20 outline-none focus:bg-white/20 w-36"
            />
            <button
              onClick={handleLogin}
              disabled={status === "loading" || !input.trim()}
              className="text-xs px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              {status === "loading" ? "..." : "Entrar"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setInput("");
              }}
              className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
              title="Cancelar"
            >
              {"\u00D7"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Iniciar sesion para sincronizar entre dispositivos"
          >
            Iniciar sesion
          </button>
        )}

        {errorMsg && status === "error" && (
          <span className="text-xs text-red-300" title={errorMsg}>
            Error
          </span>
        )}

        <button
          onClick={toggle}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
          title={mode === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
        >
          {mode === "light" ? "\u263E" : "\u2600"}
        </button>
      </div>
    </header>
  );
}
