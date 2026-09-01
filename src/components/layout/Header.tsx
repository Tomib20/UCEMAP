import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BRANDING } from "@/config/theme";
import type { Carrera } from "@/types/carrera";
import { useThemeStore } from "@/store/useThemeStore";
import { useUserStore } from "@/store/useUserStore";
import {
  useProgressStore,
  selectAprobadasArray,
  selectCursandoArray,
  selectAplazosRecord,
} from "@/store/useProgressStore";
import { isSyncConfigured } from "@/lib/googleDrive";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Logo, GoogleG } from "@/components/ui/Logo";

interface CarreraEntry {
  id: string;
  nombre: string;
}

interface HeaderProps {
  carrera: Carrera;
  carreras: CarreraEntry[];
  onSearchOpen?: () => void;
}

/** Sin Client ID de Google, la app es 100% local y no se muestra nada de login. */
const SYNC_CONFIGURADO = isSyncConfigured();

export function Header({ carrera, carreras, onSearchOpen }: HeaderProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);

  const user = useUserStore((s) => s.user);
  const remembered = useUserStore((s) => s.remembered);
  const status = useUserStore((s) => s.status);
  const errorMsg = useUserStore((s) => s.error);
  const pendingSave = useUserStore((s) => s.pendingSave);
  const login = useUserStore((s) => s.login);
  const logout = useUserStore((s) => s.logout);

  const { canInstall, promptInstall } = useInstallPrompt();

  // Sin sesion el progreso vive solo en esta pestania: conviene decirlo, porque
  // si no, uno ve materias marcadas y no sabe si estan guardadas ni de donde salieron.
  const aprobadasArr = useProgressStore(selectAprobadasArray);
  const cursandoArr = useProgressStore(selectCursandoArray);
  const aplazosRecord = useProgressStore(selectAplazosRecord);
  const hayProgreso =
    aprobadasArr.length > 0 || cursandoArr.length > 0 || Object.keys(aplazosRecord).length > 0;

  const [menuOpen, setMenuOpen] = useState(false);

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

  // Estado del guardado automatico en Drive.
  const syncLabel =
    status === "syncing" || pendingSave
      ? "Guardando..."
      : status === "error"
        ? "Sin guardar"
        : "Guardado";

  const userControls = (
    <>
      {!SYNC_CONFIGURADO ? null : user ? (
        <div className={`flex ${isMobile ? "flex-col items-stretch" : "flex-row items-center"} gap-2`}>
          <div className="flex items-center gap-2 min-w-0">
            {user.picture && (
              <img
                src={user.picture}
                alt=""
                className="w-6 h-6 rounded-full shrink-0"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="text-sm font-semibold truncate" title={user.email}>
              {user.name}
            </span>
          </div>
          <span
            className={`text-[11px] px-2 py-1 rounded-lg ${
              status === "error" ? "bg-red-500/20 text-red-200" : "bg-white/10 text-slate-200"
            }`}
            title={
              status === "error"
                ? errorMsg ?? "No se pudo guardar"
                : "Tu progreso se guarda solo en tu Google Drive"
            }
          >
            {syncLabel}
          </span>
          <button
            onClick={() => { logout(); setMenuOpen(false); }}
            className="text-xs font-semibold text-white px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
            title="Cerrar sesion"
          >
            Salir
          </button>
        </div>
      ) : remembered ? (
        // Sesion anterior recordada: reconectar es un click, pero mientras tanto
        // avisamos que lo que se toque no esta yendo a Drive.
        <div className={`flex ${isMobile ? "flex-col items-stretch" : "flex-row items-center"} gap-2`}>
          <button
            onClick={() => { void login(); setMenuOpen(false); }}
            disabled={status === "loading"}
            className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            title={`Reconectar con ${remembered.email} para volver a sincronizar`}
          >
            {remembered.picture && (
              <img src={remembered.picture} alt="" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
            )}
            {status === "loading" ? "Conectando..." : `Continuar como ${remembered.name.split(" ")[0]}`}
          </button>
          <span
            className="text-[11px] px-2 py-1 rounded-lg bg-amber-400/20 text-amber-200"
            title="Tus cambios se guardan en este dispositivo, pero no se estan sincronizando con Drive"
          >
            Sin sincronizar
          </span>
        </div>
      ) : (
        <button
          onClick={() => { void login(); setMenuOpen(false); }}
          disabled={status === "loading"}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ color: "#1f1f1f" }}
          title="Guarda tu progreso en tu Google Drive y usalo en cualquier dispositivo"
        >
          <GoogleG size={15} />
          {status === "loading" ? "Conectando..." : "Iniciar sesión con Google"}
        </button>
      )}
      {!user && hayProgreso && (
        <span
          className="text-[11px] px-2 py-1 rounded-lg bg-amber-400/20 text-amber-200"
          title="Sin sesión, lo que marques se pierde al recargar la página. Iniciá sesión para guardarlo en tu Google Drive."
        >
          No se guarda
        </span>
      )}
      {errorMsg && status === "error" && !user && (
        // El mensaje va entero: un "Error" a secas no le sirve a nadie, y el
        // detalle escondido en un tooltip no existe en mobile.
        <span
          className={`text-[11px] text-red-200 bg-red-500/15 rounded-lg px-2 py-1 leading-snug ${
            isMobile ? "" : "max-w-[280px]"
          }`}
        >
          {errorMsg}
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
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity"
              title="Volver a elegir carrera"
            >
              <Logo size={22} />
              <span className="text-sm font-bold tracking-tight">{BRANDING.name}</span>
            </button>
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
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 text-left hover:opacity-80 transition-opacity"
          title="Volver a elegir carrera"
        >
          <Logo size={34} />
          <span>
            <span className="block text-lg font-bold tracking-tight leading-tight">
              {BRANDING.name}
            </span>
            <span className="block text-[11px] text-slate-300">{BRANDING.university}</span>
          </span>
        </button>
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
