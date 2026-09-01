import { create } from "zustand";
import {
  driveLoad,
  driveSave,
  explicarErrorDeLogin,
  fetchUserInfo,
  isSyncConfigured,
  requestToken,
  revokeToken,
  type CloudProgreso,
  type GoogleUser,
} from "@/lib/googleDrive";
import { useProgressStore } from "./useProgressStore";

/**
 * Perfil de la ultima sesion. Guardamos SOLO nombre/mail/foto para poder ofrecer
 * "Continuar como ..." al volver; el token nunca se persiste, asi que reconectar
 * siempre es un click explicito del usuario.
 */
const PROFILE_KEY = "ucema-map-perfil";
const TOKEN_KEY = "ucema-map-token";

interface TokenGuardado {
  token: string;
  expiraEn: number;
}

/**
 * El token se guarda para no tener que reconectar en cada recarga. Dura lo que
 * dura el de Google (~1h) y solo habilita el `appDataFolder` de esta app y el
 * perfil basico, asi que el alcance de que lo roben es acotado.
 */
function readToken(): TokenGuardado | null {
  try {
    const raw = window.localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TokenGuardado;
    // Margen de 1 minuto: no vale la pena estrenar un token que expira ya.
    return parsed.expiraEn > Date.now() + 60_000 ? parsed : null;
  } catch {
    return null;
  }
}

function writeToken(value: TokenGuardado | null) {
  try {
    if (value) window.localStorage.setItem(TOKEN_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function readRemembered(): GoogleUser | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as GoogleUser) : null;
  } catch {
    return null;
  }
}

function writeRemembered(user: GoogleUser | null) {
  try {
    if (user) window.localStorage.setItem(PROFILE_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* ignore */
  }
}

export type SyncStatus = "idle" | "loading" | "syncing" | "ready" | "error";

interface UserState {
  user: GoogleUser | null;
  /** Access token de Google. Vive solo en memoria: nunca se persiste. */
  token: string | null;
  /** Perfil de la sesion anterior, sin token: sirve para ofrecer reconectar. */
  remembered: GoogleUser | null;
  status: SyncStatus;
  error: string | null;
  lastSyncedAt: number | null;
  /** Hay cambios que todavia no llegaron a Drive (guardado en vuelo o esperando el debounce). */
  pendingSave: boolean;
  /** Ultima carrera que el usuario tenia abierta segun Drive: a donde entrar desde la home. */
  carreraEnDrive: string | null;

  login: () => Promise<boolean>;
  /** Reconecta sin molestar al usuario si Google todavia lo reconoce. */
  restoreSession: () => Promise<void>;
  logout: () => void;
  saveNow: () => Promise<void>;
  scheduleSave: () => void;
}

/** Foto del progreso local, con la forma que se guarda en Drive. */
function snapshot(): CloudProgreso {
  const p = useProgressStore.getState();
  return {
    aprobadas: p.aprobadas,
    cursando: p.cursando,
    notas: p.notas,
    aplazos: p.aplazos,
    carreraId: p.carreraId,
  };
}

/**
 * Fusiona lo local con lo que haya en Drive. La nube gana carrera por carrera:
 * si el usuario ya cargo esa carrera en otro dispositivo, esa version manda.
 * Las carreras que solo existen en local se conservan (asi no se pierde lo que
 * alguien venia cargando sin sesion antes de loguearse por primera vez).
 */
function mergeCloudIntoLocal(remoto: CloudProgreso) {
  const local = useProgressStore.getState();
  // OJO: no se toca `carreraId`. La carrera que se ve la manda la URL; si la
  // pisaramos con la ultima guardada en Drive, el mapa mostraria las materias
  // de una carrera con el progreso de otra (y el auto-guardado lo replicaria).
  // La carrera de Drive se usa solo para saber a donde entrar desde la home.
  useProgressStore.setState({
    aprobadas: { ...local.aprobadas, ...remoto.aprobadas },
    cursando: { ...local.cursando, ...remoto.cursando },
    notas: { ...local.notas, ...remoto.notas },
    aplazos: { ...local.aplazos, ...(remoto.aplazos ?? {}) },
    selectedMateria: null,
  });
}

const SAVE_DEBOUNCE_MS = 1500;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  token: null,
  remembered: readRemembered(),
  status: "idle",
  error: null,
  lastSyncedAt: null,
  pendingSave: false,
  carreraEnDrive: null,

  /**
   * Retoma la sesion con el token guardado, sin abrir ninguna ventana de Google.
   * Si el token ya vencio, no hacemos nada: queda el boton "Continuar como ...".
   * No se puede renovar de fondo — el flujo de Google siempre abre un popup y
   * eso solo puede salir de un click del usuario.
   */
  restoreSession: async () => {
    if (get().token || !isSyncConfigured()) return;
    const guardado = readToken();
    const perfil = get().remembered;
    if (!guardado || !perfil) return;

    // Optimista: mostramos la sesion ya activa y confirmamos con Drive.
    set({ user: perfil, token: guardado.token, status: "ready" });
    try {
      const remoto = await driveLoad(guardado.token);
      if (remoto) mergeCloudIntoLocal(remoto);
      set({ lastSyncedAt: Date.now(), error: null, carreraEnDrive: remoto?.carreraId ?? null });
    } catch {
      // El token no sirvio (revocado, permisos cambiados): volvemos a pedir login.
      writeToken(null);
      set({ user: null, token: null, status: "idle" });
    }
  },

  login: async () => {
    set({ status: "loading", error: null });
    try {
      // Si ya se logueo antes en este dispositivo, se le sugiere esa cuenta y se
      // reutiliza el consentimiento: el popup pasa casi de largo. Si Google lo
      // rechaza (cambio de permisos, cuenta desconectada), se reintenta el flujo
      // completo, con selector de cuenta y pantalla de permisos.
      const recordado = get().remembered?.email;
      const { token, expiraEn } = recordado
        ? await requestToken(recordado).catch(() => requestToken())
        : await requestToken();
      const [user, remoto] = await Promise.all([fetchUserInfo(token), driveLoad(token)]);

      if (remoto) mergeCloudIntoLocal(remoto);

      writeRemembered(user);
      writeToken({ token, expiraEn });
      set({
        user,
        token,
        remembered: user,
        status: "ready",
        error: null,
        lastSyncedAt: Date.now(),
        carreraEnDrive: remoto?.carreraId ?? null,
      });

      // Primer login del usuario (todavia no hay archivo): subimos lo que tenga
      // local para que el archivo exista desde el arranque.
      if (!remoto) await get().saveNow();
      return true;
    } catch (e) {
      set({ status: "error", error: explicarErrorDeLogin(e), user: null, token: null });
      return false;
    }
  },

  logout: () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const token = get().token;
    if (token) revokeToken(token);
    // Salir es explicito y tiene que dejar el equipo limpio: se olvida el perfil,
    // el token y tambien el progreso de la sesion. Nada de esto se pierde: quedo
    // guardado en el Drive del usuario y vuelve al iniciar sesion de nuevo.
    writeRemembered(null);
    writeToken(null);
    useProgressStore.setState({
      aprobadas: {},
      cursando: {},
      notas: {},
      aplazos: {},
      selectedMateria: null,
    });
    try {
      window.sessionStorage.removeItem("ucema-map-progress");
    } catch {
      /* ignore */
    }
    set({
      user: null,
      token: null,
      remembered: null,
      status: "idle",
      error: null,
      pendingSave: false,
      carreraEnDrive: null,
    });
  },

  saveNow: async () => {
    const token = get().token;
    if (!token) return;
    set({ status: "syncing" });
    try {
      await driveSave(token, snapshot());
      // Ya esta a salvo en la nube: podemos soltar la copia que dejo la version
      // vieja de la app en localStorage (hoy el progreso vive en sessionStorage).
      try {
        window.localStorage.removeItem("ucema-map-progress");
      } catch {
        /* ignore */
      }
      set({ status: "ready", error: null, lastSyncedAt: Date.now(), pendingSave: false });
    } catch (e) {
      // Tipico: el token vencio (duran ~1h). Soltamos la sesion para que el
      // header ofrezca reconectar de un click; el progreso sigue en la pestania.
      const msg = e instanceof Error ? e.message : "No se pudo guardar";
      writeToken(null);
      set({ status: "error", error: msg, user: null, token: null });
    }
  },

  /** Agenda un guardado; cada cambio nuevo reinicia la cuenta regresiva. */
  scheduleSave: () => {
    if (!get().token) return;
    set({ pendingSave: true });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void get().saveNow();
    }, SAVE_DEBOUNCE_MS);
  },
}));
