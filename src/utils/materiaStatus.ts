import type { Materia, MateriaStatus } from "@/types/carrera";

export function getMateriaStatus(
  materia: Materia,
  aprobadas: Set<number>,
  cursando: Set<number>
): MateriaStatus {
  if (aprobadas.has(materia.nro)) return "aprobada";
  if (cursando.has(materia.nro)) return "cursando";
  if (materia.correlativas.every((nro) => aprobadas.has(nro)))
    return "disponible";
  return "bloqueada";
}
