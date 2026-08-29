/**
 * Observa el progreso y, si hay sesion de Google iniciada, agenda el guardado
 * en Drive. El guardado es automatico con debounce (ver useUserStore), asi que
 * el usuario no tiene que acordarse de apretar nada.
 */

import { useProgressStore } from "./useProgressStore";
import { useUserStore } from "./useUserStore";
import type { Nota } from "./useProgressStore";

interface CarreraSnapshot {
  aprobadas: number[];
  cursando: number[];
  notas: Record<string, Nota>;
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function notasEqual(a: Record<string, Nota>, b: Record<string, Nota>): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) if (a[k] !== b[k]) return false;
  return true;
}

function snapshotEquals(a: CarreraSnapshot, b: CarreraSnapshot): boolean {
  if (a.aprobadas !== b.aprobadas && !arraysEqual(a.aprobadas, b.aprobadas)) return false;
  if (a.cursando !== b.cursando && !arraysEqual(a.cursando, b.cursando)) return false;
  if (a.notas !== b.notas && !notasEqual(a.notas, b.notas)) return false;
  return true;
}

let initialized = false;

export function initSyncWatcher() {
  if (initialized) return;
  initialized = true;

  useProgressStore.subscribe((state, prev) => {
    if (!useUserStore.getState().token) return;

    // La carrera seleccionada tambien viaja a Drive: al entrar desde otro
    // dispositivo se abre donde estabas.
    if (state.carreraId !== prev.carreraId) {
      useUserStore.getState().scheduleSave();
      return;
    }

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
        useUserStore.getState().scheduleSave();
        return;
      }
    }
  });
}
