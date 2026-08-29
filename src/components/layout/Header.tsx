import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BRANDING } from "@/config/theme";
import type { Carrera } from "@/types/carrera";
import { useThemeStore } from "@/store/useThemeStore";
import { useUserStore } from "@/store/useUserStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

interface CarreraEntry {
  id: string;
  nombre: string;
}

interface HeaderProps {
  carrera: Carrera;
  carreras: CarreraEntry[];
  onSearchOpen?: () => void;
}

export function Header({ carrera, carreras, onSearchOpen }: HeaderProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);

  const usuario = useUserStore((s) => s.usuario);
  const status = useUserStore((s) => s.status);
  const errorMsg = useUserStore((s) => s.error);
  const isDirty = useUserStore((s) => s.isDirty);
  const login = useUserStore((s) => s.login);
  const logout = useUserStore((s) => s.logout);
  const saveToCloud = useUserStore((s) => s.saveToCloud);

  const { canInstall, promptInstall } = useInstallPrompt();

  const [input, setInput] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogin = async () => {
    const ok = await login(input);
    if (ok) {
      setInput("");
      setLoginOpen(false);
    }
  };

  /* ── Shared UI pieces ── */

  const searchButton = onSearchOpen && (
    <button
      onClick={onSearchOpen}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs text-slate-300"
      title="Buscar materia"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      {!isMobile && (
        <span className="opacity-70 text-[10px]">
          {typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent) ? "⌘K" : "Ctrl+K"}
        </span>
      )}
    </button>
  );

  // Solo aparece si el navegador ofrecio instalar la app (Chrome/Edge).
  const installButton = canInstall ? (
    <button
      onClick={promptInstall}
      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 bg-teal hover:bg-teal-light transition-colors text-white"
      title="Instalar UCEMA Map en tu dispositivo"
    >
      <span aria-hidden>{"⬇"}</span> Instalar app
    </button>
  ) : null;

  const themeButton = (
    <button
      onClick={toggle}
      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
      title={mode === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
    >
      {mode === "light" ? "\u263E" : "\u2600"}
    </button>
  );

  const userControls = (
    <>
      {usuario ? (
        <div className={`flex ${isMobile ? "flex-col" : "flex-row"} items-${isMobile ? "stretch" : "center"} gap-2`}>
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
            onClick={() => { logout(); setMenuOpen(false); }}
            className="text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Cerrar sesion"
          >
            Salir
          </button>
        </div>
      ) : loginOpen ? (
        <div className={`flex ${isMobile ? "flex-col" : "flex-row"} items-${isMobile ? "stretch" : "center"} gap-1`}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
              if (e.key === "Escape") {
                setLoginOpen(false);
                setInput("");
              }
            }}
            placeholder="usuario UCEMA"
            autoFocus
            className="bg-white/10 text-white placeholder-slate-400 text-sm rounded-lg px-2 py-1 border border-white/20 outline-none focus:bg-white/20 w-full"
          />
          <div className="flex gap-1">
            <button
              onClick={handleLogin}
              disabled={status === "loading" || !input.trim()}
              className="text-xs px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 flex-1"
            >
              {status === "loading" ? "..." : "Entrar"}
            </button>
            <button
              onClick={() => { setLoginOpen(false); setInput(""); }}
              className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
              title="Cancelar"
            >
              {"\u00D7"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setLoginOpen(true)}
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
    </>
  );

  /* ── Mobile header ── */
  if (isMobile) {
    return (
      <>
        <header className="bg-navy text-white px-3 py-2 flex items-center justify-between shadow-md relative z-30">
          {/* Left: compact branding + carrera */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h1 className="text-sm font-bold tracking-tight shrink-0">
              {BRANDING.name}
            </h1>
            <div className="h-5 w-px bg-white/20 shrink-0" />
            {carreras.length > 1 ? (
              <select
                value={carrera.id}
                onChange={(e) => navigate(`/carrera/${e.target.value}`)}
                className="bg-white/10 text-white text-xs font-semibold rounded-lg px-1.5 py-1 border border-white/20 cursor-pointer outline-none min-w-0 truncate"
              >
                {carreras.map((c) => (
                  <option key={c.id} value={c.id} className="bg-navy text-white">
                    {c.nombre}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-semibold truncate">{carrera.nombre}</span>
            )}
          </div>

          {/* Right: search + hamburger */}
          <div className="flex items-center gap-1 shrink-0">
            {searchButton}
            <button
              onClick={() => setMenuOpen((p) => !p)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
              title="Menu"
            >
              {menuOpen ? "\u2715" : "\u2630"}
            </button>
          </div>
        </header>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute top-[44px] left-0 right-0 z-30 bg-navy border-t border-white/10 px-4 py-3 shadow-lg flex flex-col gap-3">
              {canInstall && (
                <button
                  onClick={() => { promptInstall(); setMenuOpen(false); }}
                  className="w-full text-sm font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-2 bg-teal hover:bg-teal-light transition-colors text-white"
                >
                  <span aria-hidden>{"⬇"}</span> Instalar app
                </button>
              )}
              {userControls}
              <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                {themeButton}
                <span className="text-xs text-slate-400">
                  {mode === "light" ? "Modo oscuro" : "Modo claro"}
                </span>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  /* ── Desktop header ── */
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
              onChange={(e) => navigate(`/carrera/${e.target.value}`)}
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
        {installButton}
        {userControls}
        {searchButton}
        {themeButton}
      </div>
    </header>
  );
}
