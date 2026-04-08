import type { Materia } from "@/types/carrera";

export interface AdjacencyMaps {
  /** nro -> set of direct prerequisite nros */
  prerequisitesOf: Map<number, Set<number>>;
  /** nro -> set of nros that depend on this materia */
  dependentsOf: Map<number, Set<number>>;
}

export function buildAdjacencyMaps(materias: Materia[]): AdjacencyMaps {
  const prerequisitesOf = new Map<number, Set<number>>();
  const dependentsOf = new Map<number, Set<number>>();

  for (const m of materias) {
    prerequisitesOf.set(m.nro, new Set(m.correlativas));
    if (!dependentsOf.has(m.nro)) dependentsOf.set(m.nro, new Set());
    for (const prereq of m.correlativas) {
      if (!dependentsOf.has(prereq)) dependentsOf.set(prereq, new Set());
      dependentsOf.get(prereq)!.add(m.nro);
    }
  }

  return { prerequisitesOf, dependentsOf };
}

/** Get all ancestors (recursive prerequisites) */
export function getAncestors(
  nro: number,
  maps: AdjacencyMaps
): Set<number> {
  const result = new Set<number>();
  const stack = [...(maps.prerequisitesOf.get(nro) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (result.has(current)) continue;
    result.add(current);
    for (const prereq of maps.prerequisitesOf.get(current) ?? []) {
      stack.push(prereq);
    }
  }
  return result;
}

/** Get all descendants (what this materia unlocks, recursively) */
export function getDescendants(
  nro: number,
  maps: AdjacencyMaps
): Set<number> {
  const result = new Set<number>();
  const stack = [...(maps.dependentsOf.get(nro) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (result.has(current)) continue;
    result.add(current);
    for (const dep of maps.dependentsOf.get(current) ?? []) {
      stack.push(dep);
    }
  }
  return result;
}
