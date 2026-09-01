import type { Materia, MateriaStatus } from "@/types/carrera";

/**
 * Orden de precedencia: aprobada > cursando > aplazada > disponible > bloqueada.
 *
 * El aplazo es un dato que queda registrado hasta aprobar la materia, asi que
 * convive con los demas estados: si la estas recursando se muestra "cursando"
 * (y el nodo lleva igual la marca del aplazo). Un aplazo no habilita
 * correlativas: para eso la materia tiene que estar aprobada.
 */
export function getMateriaStatus(
  materia: Materia,
  aprobadas: Set<number>,
  cursando: Set<number>,
  aplazadas: Set<number> = new Set()
): MateriaStatus {
  if (aprobadas.has(materia.nro)) return "aprobada";
  if (cursando.has(materia.nro)) return "cursando";
  if (aplazadas.has(materia.nro)) return "aplazada";
  if (materia.correlativas.every((nro) => aprobadas.has(nro)))
    return "disponible";
  return "bloqueada";
}
