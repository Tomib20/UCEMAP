import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const STORAGE_KEY = "ucema-map-progress";
const TOKEN_KEY = "ucema-map-token";

/**
 * Hay sesion de Google activa? Se lee directo del token guardado en vez de
 * preguntarle a useUserStore, para no armar un ciclo de imports entre los dos
 * stores (useUserStore ya importa este).
 */
function haySesion(): boolean {
  try {
    const raw = window.localStorage.getItem(TOKEN_KEY);
    if (!raw) return false;
    const { expiraEn } = JSON.parse(raw) as { expiraEn: number };
    return expiraEn > Date.now();
  } catch {
    return false;
  }
}

/**
 * El progreso se guarda SOLO si hay sesion de Google iniciada, y en
 * `sessionStorage` (como cache de la pestania, mientras la fuente de verdad es
 * el Drive del usuario).
 *
 * Sin sesion no se escribe nada: al recargar, el mapa arranca vacio. Es a
 * proposito — si no hay donde guardarlo, mostrar materias marcadas de una
 * visita anterior confunde mas de lo que ayuda, y en una compu compartida deja
 * el progreso de otro a la vista. Para volver a cargarlo estan el login y el
 * importador de notas.
 *
 * Las versiones viejas guardaban en localStorage. Ese mapa NO se adopta solo:
 * `RecuperarProgreso` le pregunta al usuario si quiere conservarlo o arrancar
 * limpio, asi a nadie le aparece progreso que no pidio.
 */
const storageCondicional = {
  getItem: (nombre: string) => (haySesion() ? window.sessionStorage.getItem(nombre) : null),
  setItem: (nombre: string, valor: string) => {
    if (haySesion()) window.sessionStorage.setItem(nombre, valor);
    else window.sessionStorage.removeItem(nombre);
  },
  removeItem: (nombre: string) => window.sessionStorage.removeItem(nombre),
};
interface ProgresoGuardado {
  carreraId?: string;
  aprobadas?: Record<string, number[]>;
  cursando?: Record<string, number[]>;
  notas?: Record<string, Record<string, Nota>>;
  aplazos?: Record<string, Record<string, NotaAplazo>>;
}

/**
 * Se evalua al cargar el modulo, ANTES de que el store escriba nada: apenas la
 * app toca el progreso, `sessionStorage` deja de estar vacio y ya no se podria
 * distinguir "sesion recien empezada" de "sesion en curso".
 */
const LEGACY_AL_INICIO: ProgresoGuardado | null = (() => {
  try {
    if (window.sessionStorage.getItem(STORAGE_KEY)) return null; // sesion ya empezada
    if (!haySesion()) return null; // sin sesion no hay donde guardarlo
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
    aplazos: state.aplazos ?? {},
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

/** Nota de un aplazo: 0 a 3 (el 0 tambien lo ponen los profesores). */
export type NotaAplazo = 0 | 1 | 2 | 3;

interface ProgressState {
  carreraId: string;
  aprobadas: Record<string, number[]>;
  cursando: Record<string, number[]>;
  notas: Record<string, Record<string, Nota>>;
  /**
   * Aplazos por carrera: nro de materia -> nota (1 a 3). Va aparte de `notas`
   * porque una materia puede tener un aplazo y despues, al recursarla, una nota
   * de aprobada: en la historia academica figuran las dos.
   */
  aplazos: Record<string, Record<string, NotaAplazo>>;
  selectedMateria: number | null;
  fullChain: boolean;
  centerOnMateria: number | null;

  toggleAprobada: (nro: number) => void;
  toggleCursando: (nro: number) => void;
  setNota: (nro: number, nota: Nota) => void;
  setAplazo: (nro: number, nota: NotaAplazo) => void;
  quitarAplazo: (nro: number) => void;
  /** Borra todo lo marcado en la carrera actual. */
  vaciarCarrera: () => void;
  /** Reemplaza el progreso de la carrera actual con lo importado del sistema. */
  importarProgreso: (datos: {
    aprobadas: number[];
    notas: Record<string, Nota>;
    aplazos: Record<string, NotaAplazo>;
  }) => void;
  selectMateria: (nro: number | null) => void;
  setCarrera: (id: string) => void;
  toggleFullChain: () => void;
  requestCenterOn: (nro: number) => void;
  clearCenterOn: () => void;
}

const EMPTY_ARRAY: number[] = [];
const EMPTY_NOTAS: Record<string, Nota> = {};
const EMPTY_APLAZOS: Record<string, NotaAplazo> = {};

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      carreraId: "ingenieria-informatica",
      aprobadas: {},
      cursando: {},
      notas: {},
      aplazos: {},
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

      /** Registra el aplazo. No toca cursando: se puede estar recursando la materia. */
      setAplazo: (nro: number, nota: NotaAplazo) =>
        set((state) => {
          const carreraAplazos = { ...(state.aplazos[state.carreraId] ?? {}) };
          carreraAplazos[String(nro)] = nota;
          return { aplazos: { ...state.aplazos, [state.carreraId]: carreraAplazos } };
        }),

      quitarAplazo: (nro: number) =>
        set((state) => {
          const carreraAplazos = { ...(state.aplazos[state.carreraId] ?? {}) };
          delete carreraAplazos[String(nro)];
          return { aplazos: { ...state.aplazos, [state.carreraId]: carreraAplazos } };
        }),

      vaciarCarrera: () =>
        set((state) => ({
          aprobadas: { ...state.aprobadas, [state.carreraId]: [] },
          cursando: { ...state.cursando, [state.carreraId]: [] },
          notas: { ...state.notas, [state.carreraId]: {} },
          aplazos: { ...state.aplazos, [state.carreraId]: {} },
          selectedMateria: null,
        })),

      importarProgreso: ({ aprobadas, notas, aplazos }) =>
        set((state) => {
          // "Cursando" no figura en las notas oficiales (una materia en curso
          // todavia no tiene nota), asi que se conserva lo que el usuario haya
          // marcado, salvo las materias que la importacion da por aprobadas.
          const cursandoActual = state.cursando[state.carreraId] ?? [];
          const aprobadasSet = new Set(aprobadas);
          const cursando = cursandoActual.filter((nro) => !aprobadasSet.has(nro));

          return {
            aprobadas: { ...state.aprobadas, [state.carreraId]: aprobadas },
            notas: { ...state.notas, [state.carreraId]: notas },
            aplazos: { ...state.aplazos, [state.carreraId]: aplazos },
            cursando: { ...state.cursando, [state.carreraId]: cursando },
            selectedMateria: null,
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
      storage: createJSONStorage(() => storageCondicional),
      partialize: (state) => ({
        carreraId: state.carreraId,
        aprobadas: state.aprobadas,
        cursando: state.cursando,
        notas: state.notas,
        aplazos: state.aplazos,
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

export function selectAplazosRecord(s: ProgressState): Record<string, NotaAplazo> {
  return s.aplazos[s.carreraId] ?? EMPTY_APLAZOS;
}

