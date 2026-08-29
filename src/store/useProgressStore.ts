import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const STORAGE_KEY = "ucema-map-progress";

/**
 * El progreso se guarda en `sessionStorage`: sobrevive recargas mientras la
 * pestania siga abierta, pero al cerrarla no queda nada en el dispositivo.
 * Lo unico que persiste de verdad es lo que se sincroniza al Drive del usuario.
 *
 * Las versiones viejas guardaban en localStorage. Ese mapa NO se adopta solo:
 * `RecuperarProgreso` le pregunta al usuario si quiere conservarlo o arrancar
 * limpio, asi a nadie le aparece progreso que no pidio.
 */
interface ProgresoGuardado {
  carreraId?: string;
  aprobadas?: Record<string, number[]>;
  cursando?: Record<string, number[]>;
  notas?: Record<string, Record<string, Nota>>;
}

/**
 * Se evalua al cargar el modulo, ANTES de que el store escriba nada: apenas la
 * app toca el progreso, `sessionStorage` deja de estar vacio y ya no se podria
 * distinguir "sesion recien empezada" de "sesion en curso".
 */
const LEGACY_AL_INICIO: ProgresoGuardado | null = (() => {
  try {
    if (window.sessionStorage.getItem(STORAGE_KEY)) return null; // sesion ya empezada
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: ProgresoGuardado };
    const state = parsed.state;
    if (!state) return null;
    const materias = Object.values(state.aprobadas ?? {}).reduce((n, arr) => n + arr.length, 0);
    return materias > 0 ? state : null;
  } catch {
    return null;
  }
})();

/** Mapa de una version anterior que quedo en localStorage, si hay alguno. */
export function leerProgresoLegacy(): ProgresoGuardado | null {
  return LEGACY_AL_INICIO;
}

/** Adopta ese mapa: pasa a ser el progreso de esta sesion. */
export function adoptarProgresoLegacy(state: ProgresoGuardado) {
  useProgressStore.setState({
    aprobadas: state.aprobadas ?? {},
    cursando: state.cursando ?? {},
    notas: state.notas ?? {},
    carreraId: state.carreraId ?? useProgressStore.getState().carreraId,
    selectedMateria: null,
  });
}

/** Lo descarta para siempre: el usuario eligio arrancar de cero. */
export function descartarProgresoLegacy() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Nota: 4-10 or "AP" (aprobada sin nota, no afecta promedio) */
export type Nota = number | "AP";

interface ProgressState {
  carreraId: string;
  aprobadas: Record<string, number[]>;
  cursando: Record<string, number[]>;
  notas: Record<string, Record<string, Nota>>;
  selectedMateria: number | null;
  fullChain: boolean;
  centerOnMateria: number | null;

  toggleAprobada: (nro: number) => void;
  toggleCursando: (nro: number) => void;
  setNota: (nro: number, nota: Nota) => void;
  selectMateria: (nro: number | null) => void;
  setCarrera: (id: string) => void;
  toggleFullChain: () => void;
  requestCenterOn: (nro: number) => void;
  clearCenterOn: () => void;
}

const EMPTY_ARRAY: number[] = [];
const EMPTY_NOTAS: Record<string, Nota> = {};

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      carreraId: "ingenieria-informatica",
      aprobadas: {},
      cursando: {},
      notas: {},
      selectedMateria: null,
      fullChain: false,
      centerOnMateria: null,

      toggleAprobada: (nro: number) =>
        set((state) => {
          const current = state.aprobadas[state.carreraId] ?? [];
          const isRemoving = current.includes(nro);
          const nextAprobadas = isRemoving
            ? current.filter((n) => n !== nro)
            : [...current, nro];

          // If adding as aprobada, remove from cursando
          let nextCursando = state.cursando;
          if (!isRemoving) {
            const curCursando = state.cursando[state.carreraId] ?? [];
            if (curCursando.includes(nro)) {
              nextCursando = {
                ...state.cursando,
                [state.carreraId]: curCursando.filter((n) => n !== nro),
              };
            }
          }

          // If removing aprobada, also remove nota
          let nextNotas = state.notas;
          if (isRemoving) {
            const carreraNotas = { ...(state.notas[state.carreraId] ?? {}) };
            delete carreraNotas[String(nro)];
            nextNotas = { ...state.notas, [state.carreraId]: carreraNotas };
          }

          return {
            aprobadas: { ...state.aprobadas, [state.carreraId]: nextAprobadas },
            cursando: nextCursando,
            notas: nextNotas,
          };
        }),

      toggleCursando: (nro: number) =>
        set((state) => {
          const current = state.cursando[state.carreraId] ?? [];
          const isRemoving = current.includes(nro);
          const nextCursando = isRemoving
            ? current.filter((n) => n !== nro)
            : [...current, nro];
          return {
            cursando: { ...state.cursando, [state.carreraId]: nextCursando },
          };
        }),

      setNota: (nro: number, nota: Nota) =>
        set((state) => {
          const carreraNotas = { ...(state.notas[state.carreraId] ?? {}) };
          carreraNotas[String(nro)] = nota;
          return {
            notas: { ...state.notas, [state.carreraId]: carreraNotas },
          };
        }),

      selectMateria: (nro) => set({ selectedMateria: nro }),
      setCarrera: (id) => set({ carreraId: id, selectedMateria: null }),
      toggleFullChain: () => set((s) => ({ fullChain: !s.fullChain })),
      requestCenterOn: (nro) => set({ centerOnMateria: nro }),
      clearCenterOn: () => set({ centerOnMateria: null }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        carreraId: state.carreraId,
        aprobadas: state.aprobadas,
        cursando: state.cursando,
        notas: state.notas,
      }),
    }
  )
);

export function selectAprobadasArray(s: ProgressState): number[] {
  return s.aprobadas[s.carreraId] ?? EMPTY_ARRAY;
}

export function selectCursandoArray(s: ProgressState): number[] {
  return s.cursando[s.carreraId] ?? EMPTY_ARRAY;
}

export function selectNotasRecord(s: ProgressState): Record<string, Nota> {
  return s.notas[s.carreraId] ?? EMPTY_NOTAS;
}

