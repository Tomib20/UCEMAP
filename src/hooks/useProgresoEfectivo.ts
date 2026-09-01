import { useMemo } from "react";
import { useProgressStore, type Nota, type NotaAplazo } from "@/store/useProgressStore";
import carrerasIndex from "../../data/carreras/index.json";

/**
 * El progreso que corresponde mostrar en una carrera, sumando lo cursado en las
 * demas.
 *
 * El `nro` de una materia es el codigo de materia de UCEMA, no un id por
 * carrera: 214 de los 327 codigos aparecen en mas de un plan. Si alguien aprobo
 * Analisis Matematico II en Ingenieria, es la misma acta que la de Contador, y
 * corresponde mostrarla aprobada ahi tambien.
 *
 * `origenDeOtraCarrera` dice cual de esas materias no viene del progreso de la
 * carrera abierta, para poder marcarlas distinto y explicar de donde salieron.
 *
 * Ojo: esto NO cubre equivalencias entre materias de codigo distinto (por
 * ejemplo "Analisis Matematico I" de Ingenieria contra "Analisis Matematico" del
 * resto). Eso lo declara la universidad en la seccion "Equivalencias de
 * Materias" de cada plan y todavia no lo usamos.
 */
export interface ProgresoEfectivo {
  aprobadas: Set<number>;
  cursando: Set<number>;
  aplazadas: Set<number>;
  /** nro -> nombre de la carrera donde se marco, solo para las de otras carreras. */
  origenDeOtraCarrera: Map<number, string>;
  /** Nota de la materia, sin importar en que carrera se haya cargado. */
  notaDe: (nro: number) => Nota | undefined;
  /** Nota del aplazo, sin importar en que carrera se haya cargado. */
  aplazoDe: (nro: number) => NotaAplazo | undefined;
}

const NOMBRE_CARRERA = new Map(carrerasIndex.carreras.map((c) => [c.id, c.nombre]));

/** Junta un `Record<carreraId, number[]>` en un solo Set, anotando el origen. */
function unir(
  porCarrera: Record<string, number[]>,
  carreraActual: string,
  origen: Map<number, string>
): Set<number> {
  const total = new Set<number>(porCarrera[carreraActual] ?? []);
  for (const [carreraId, nros] of Object.entries(porCarrera)) {
    if (carreraId === carreraActual) continue;
    for (const nro of nros) {
      if (total.has(nro)) continue;
      total.add(nro);
      if (!origen.has(nro)) {
        origen.set(nro, NOMBRE_CARRERA.get(carreraId) ?? carreraId);
      }
    }
  }
  return total;
}

export function useProgresoEfectivo(): ProgresoEfectivo {
  const carreraId = useProgressStore((s) => s.carreraId);
  const aprobadasPorCarrera = useProgressStore((s) => s.aprobadas);
  const cursandoPorCarrera = useProgressStore((s) => s.cursando);
  const notasPorCarrera = useProgressStore((s) => s.notas);
  const aplazosPorCarrera = useProgressStore((s) => s.aplazos);

  return useMemo(() => {
    const origenDeOtraCarrera = new Map<number, string>();
    const aprobadas = unir(aprobadasPorCarrera, carreraId, origenDeOtraCarrera);
    const cursando = unir(cursandoPorCarrera, carreraId, origenDeOtraCarrera);

    // Los aplazos son un Record<nro, nota> por carrera: se aplanan igual.
    const aplazadas = new Set<number>();
    const aplazosPlanos = new Map<number, NotaAplazo>();
    const propios = aplazosPorCarrera[carreraId] ?? {};
    for (const [nro, nota] of Object.entries(propios)) {
      aplazadas.add(Number(nro));
      aplazosPlanos.set(Number(nro), nota);
    }
    for (const [otraCarrera, registros] of Object.entries(aplazosPorCarrera)) {
      if (otraCarrera === carreraId) continue;
      for (const [nro, nota] of Object.entries(registros)) {
        const n = Number(nro);
        if (aplazadas.has(n)) continue;
        aplazadas.add(n);
        aplazosPlanos.set(n, nota);
        if (!origenDeOtraCarrera.has(n)) {
          origenDeOtraCarrera.set(n, NOMBRE_CARRERA.get(otraCarrera) ?? otraCarrera);
        }
      }
    }

    // La nota de la carrera abierta gana; si no esta, se busca en las demas.
    const notasPlanas = new Map<number, Nota>();
    for (const [otraCarrera, registros] of Object.entries(notasPorCarrera)) {
      if (otraCarrera === carreraId) continue;
      for (const [nro, nota] of Object.entries(registros)) {
        if (!notasPlanas.has(Number(nro))) notasPlanas.set(Number(nro), nota);
      }
    }
    for (const [nro, nota] of Object.entries(notasPorCarrera[carreraId] ?? {})) {
      notasPlanas.set(Number(nro), nota);
    }

    return {
      aprobadas,
      cursando,
      aplazadas,
      origenDeOtraCarrera,
      notaDe: (nro: number) => notasPlanas.get(nro),
      aplazoDe: (nro: number) => aplazosPlanos.get(nro),
    };
  }, [carreraId, aprobadasPorCarrera, cursandoPorCarrera, notasPorCarrera, aplazosPorCarrera]);
}
