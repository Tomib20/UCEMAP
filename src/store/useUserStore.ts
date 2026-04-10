import { create } from "zustand";
import { fetchUsuario, postRegistro, postUsuario } from "@/api/sheetsBackend";
import type { CarreraMapa } from "@/api/sheetsBackend";
import { useProgressStore } from "./useProgressStore";
import { setLastPostedCarrera } from "./syncWatcher";

const STORAGE_KEY = "ucema-map-usuario";

export type LoginStatus = "idle" | "loading" | "syncing" | "ready" | "error";

interface UserState {
  usuario: string | null;
  status: LoginStatus;
  error: string | null;
  lastSyncedAt: number | null;
  isDirty: boolean;

  login: (usuario: string) => Promise<boolean>;
  logout: () => Promise<void>;
  bootFromStorage: () => Promise<void>;
  saveToCloud: () => Promise<void>;
  markDirty: () => void;
}

async function pushAllCarrerasToCloud(usuario: string): Promise<void> {
  const progress = useProgressStore.getState();
  const carreraIds = new Set([
    ...Object.keys(progress.aprobadas),
    ...Object.keys(progress.cursando),
    ...Object.keys(progress.notas),
  ]);
  // Postea TODA carrera tocada en local, incluso si esta vacia. Esto permite
  // "borrar todo" guardando explicitamente un mapa vacio (caso contrario, el
  // ultimo registro no-vacio quedaria como vigente en la nube para siempre).
  for (const cid of carreraIds) {
    const mapa: CarreraMapa = {
      aprobadas: progress.aprobadas[cid] ?? [],
      cursando: progress.cursando[cid] ?? [],
      notas: progress.notas[cid] ?? {},
    };
    await postRegistro(usuario, cid, mapa).catch(() => undefined);
  }
}

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(value: string | null) {
  try {
    if (value == null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

export const useUserStore = create<UserState>((set, get) => ({
  usuario: null,
  status: "idle",
  error: null,
  lastSyncedAt: null,
  isDirty: false,

  login: async (usuarioRaw: string) => {
    const usuario = usuarioRaw.trim().toLowerCase();
    if (!usuario) {
      set({ error: "Usuario vacio", status: "error" });
      return false;
    }
    set({ status: "loading", error: null });
    try {
      const remoto = await fetchUsuario(usuario);
      const progress = useProgressStore.getState();

      // Login = SOLO cargar del cloud. Nunca pushea data local.
      // Reemplaza local con lo que haya en la nube (aunque este vacio).
      const aprobadas: Record<string, number[]> = {};
      const cursando: Record<string, number[]> = {};
      const notas: Record<string, Record<string, CarreraMapa["notas"][string]>> = {};
      for (const reg of remoto.registros) {
        aprobadas[reg.carreraId] = reg.mapa.aprobadas ?? [];
        cursando[reg.carreraId] = reg.mapa.cursando ?? [];
        notas[reg.carreraId] = reg.mapa.notas ?? {};
      }
      const carreraId = remoto.carreraActual ?? progress.carreraId;
      useProgressStore.setState({
        aprobadas,
        cursando,
        notas,
        carreraId,
        selectedMateria: null,
      });

      // Si el usuario es brand new, lo registramos en `usuarios` (sin tocar
      // sus materias) para que la proxima vez sea reconocido. No pushea
      // ninguna materia — para eso esta el boton Guardar.
      if (!remoto.isKnown) {
        await postUsuario(usuario, carreraId);
      }

      // Sincronizar el cache del syncWatcher para no repostear la misma carrera
      setLastPostedCarrera(carreraId);

      writeStored(usuario);
      set({
        usuario,
        status: "ready",
        error: null,
        lastSyncedAt: Date.now(),
        isDirty: false,
      });
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      set({ status: "error", error: msg });
      return false;
    }
  },

  logout: async () => {
    // Si hay cambios sin guardar, pedimos confirmacion. Logout NO guarda
    // automaticamente — si el usuario sale sin haber apretado "Guardar",
    // los cambios se pierden. Esto mantiene la pureza del modelo manual.
    if (get().isDirty) {
      const ok = window.confirm(
        "Tenés cambios sin guardar que se van a perder. ¿Salir igual?"
      );
      if (!ok) return;
    }

    // 1. Limpiar usuario y cache del syncWatcher primero para que no marque
    // dirty al limpiar el progress.
    setLastPostedCarrera(null);
    writeStored(null);
    set({
      usuario: null,
      status: "idle",
      error: null,
      lastSyncedAt: null,
      isDirty: false,
    });

    // 2. Limpiar la data local del progreso. fullChain y carreraId se mantienen
    // (preferencias de UI, no son del usuario logueado).
    useProgressStore.setState({
      aprobadas: {},
      cursando: {},
      notas: {},
      selectedMateria: null,
    });
  },

  bootFromStorage: async () => {
    const stored = readStored();
    if (!stored) return;
    await get().login(stored);
  },

  saveToCloud: async () => {
    const usuarioActual = get().usuario;
    if (!usuarioActual) return;
    set({ status: "syncing" });
    try {
      await pushAllCarrerasToCloud(usuarioActual);
      set({ status: "ready", isDirty: false, lastSyncedAt: Date.now() });
    } catch {
      set({ status: "ready" });
    }
  },

  markDirty: () => {
    if (get().usuario && !get().isDirty) {
      set({ isDirty: true });
    }
  },
}));
