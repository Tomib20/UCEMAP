/**
 * Observa cambios en useProgressStore y los marca como "dirty" para que el
 * usuario los pueda guardar manualmente con el boton del header.
 *
 * Tambien postea a USER_FORM cuando cambia la carrera actual seleccionada,
 * para que el proximo login arranque en la carrera correcta. Eso si es
 * automatico porque no es data del usuario, es solo una preferencia.
 */

import { useProgressStore } from "./useProgressStore";
import { useUserStore } from "./useUserStore";
import { postUsuario } from "@/api/sheetsBackend";
import type { Nota } from "./useProgressStore";

interface CarreraSnapshot {
  aprobadas: number[];
  cursando: number[];
  notas: Record<string, Nota>;
}

function snapshotEquals(a: CarreraSnapshot, b: CarreraSnapshot): boolean {
  if (a.aprobadas !== b.aprobadas && !arraysEqual(a.aprobadas, b.aprobadas)) return false;
  if (a.cursando !== b.cursando && !arraysEqual(a.cursando, b.cursando)) return false;
  if (a.notas !== b.notas && !notasEqual(a.notas, b.notas)) return false;
  return true;
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function notasEqual(a: Record<string, Nota>, b: Record<string, Nota>): boolean {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (a[k] !== b[k]) return false;
  return true;
}

let initialized = false;

/**
 * Ultima carrera posteada al sheet "usuarios" para este usuario.
 * Evita postear filas duplicadas si la carrera no cambio realmente.
 */
let lastPostedCarrera: string | null = null;

/** Llamar despues de login/logout para sincronizar el cache. */
export function setLastPostedCarrera(carreraId: string | null) {
  lastPostedCarrera = carreraId;
}

export function initSyncWatcher() {
  if (initialized) return;
  initialized = true;

  useProgressStore.subscribe((state, prev) => {
    // 1. Cambio de carrera seleccionada → postear a USER_FORM solo si es diferente
    //    a lo que ya esta en la nube (evita filas duplicadas).
    if (state.carreraId !== prev.carreraId) {
      const usuario = useUserStore.getState().usuario;
      if (usuario && state.carreraId !== lastPostedCarrera) {
        lastPostedCarrera = state.carreraId;
        postUsuario(usuario, state.carreraId).catch(() => undefined);
      }
    }

    // 2. Cambios en data de cualquier carrera → marcar dirty si hay usuario.
    const usuario = useUserStore.getState().usuario;
    if (!usuario) return;

    const carreraIds = new Set([
      ...Object.keys(state.aprobadas),
      ...Object.keys(state.cursando),
      ...Object.keys(state.notas),
      ...Object.keys(prev.aprobadas),
      ...Object.keys(prev.cursando),
      ...Object.keys(prev.notas),
    ]);
    for (const cid of carreraIds) {
      const cur: CarreraSnapshot = {
        aprobadas: state.aprobadas[cid] ?? [],
        cursando: state.cursando[cid] ?? [],
        notas: state.notas[cid] ?? {},
      };
      const old: CarreraSnapshot = {
        aprobadas: prev.aprobadas[cid] ?? [],
        cursando: prev.cursando[cid] ?? [],
        notas: prev.notas[cid] ?? {},
      };
      if (!snapshotEquals(cur, old)) {
        useUserStore.getState().markDirty();
        return;
      }
    }
  });
}
