import { create } from "zustand";
import { persist } from "zustand/middleware";

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
      name: "ucema-map-progress",
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

