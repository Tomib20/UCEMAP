import type { Carrera, Materia } from "@/types/carrera";
import type { Nota, NotaAplazo } from "@/store/useProgressStore";

/**
 * Parseo del listado de "Notas oficiales" del sistema de alumnos de UCEMA.
 *
 * El usuario abre esa pagina, hace Ctrl+A / Ctrl+C y pega todo aca. Al copiar
 * una tabla HTML las celdas quedan separadas por tabuladores, pero segun el
 * navegador pueden venir espacios: se acepta cualquier separacion.
 *
 * Cada fila es:  codigo <sep> materia <sep> nota <sep> fecha
 *   1022  Programacion III   10   17/07/2026
 *   14722 Teoria de la Informacion   AP   05/02/2026
 *
 * Todo lo demas (menu, encabezados, "Promedio del alumno: 8.67") se ignora
 * porque no matchea el patron.
 */

/** Una fila reconocida en el texto pegado. */
export interface FilaNota {
  codigo: number;
  nombre: string;
  /** Nota tal como figura: 1 a 10, o "AP" (aprobada sin nota). */
  nota: Nota;
  fecha: string;
}

export interface MateriaImportada {
  materia: Materia;
  nota: Nota;
  fecha: string;
  /** Nota menor a 4: la materia no quedo aprobada. */
  esAplazo: boolean;
}

export interface ResultadoImportacion {
  /** Filas que se pudieron cruzar con una materia del plan. */
  reconocidas: MateriaImportada[];
  /** Filas validas del listado que no existen en esta carrera. */
  desconocidas: FilaNota[];
  /** true si no se reconocio ninguna fila: el texto pegado no era el listado. */
  vacio: boolean;
}

const FILA = /^\s*(\d{1,6})\s+(.+?)\s+(AP|\d{1,2})\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s*$/i;

/** Quita acentos y normaliza espacios, para comparar nombres de materias. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrae las filas de notas del texto pegado, ignorando todo lo demas. */
export function parsearNotas(texto: string): FilaNota[] {
  const filas: FilaNota[] = [];
  for (const linea of texto.split(/\r?\n/)) {
    const m = FILA.exec(linea);
    if (!m) continue;

    const nota = m[3].toUpperCase() === "AP" ? "AP" : Number(m[3]);
    // El sistema usa 0 a 10; cualquier otra cosa es una fila que no era una nota.
    if (typeof nota === "number" && (nota < 0 || nota > 10)) continue;

    filas.push({
      codigo: Number(m[1]),
      nombre: m[2].trim(),
      nota,
      fecha: m[4],
    });
  }
  return filas;
}

/**
 * Cruza las filas con el plan de la carrera. Primero por codigo (que es el
 * mismo `nro` del plan de estudios) y, si no aparece, por nombre normalizado:
 * a veces el listado escribe la materia distinto que el plan.
 */
export function importarNotas(texto: string, carrera: Carrera): ResultadoImportacion {
  const filas = parsearNotas(texto);
  const porNro = new Map(carrera.materias.map((m) => [m.nro, m]));
  const porNombre = new Map(carrera.materias.map((m) => [normalizar(m.nombre), m]));

  const reconocidas: MateriaImportada[] = [];
  const desconocidas: FilaNota[] = [];
  const yaVistas = new Set<number>();

  for (const fila of filas) {
    const materia = porNro.get(fila.codigo) ?? porNombre.get(normalizar(fila.nombre));
    if (!materia) {
      desconocidas.push(fila);
      continue;
    }
    // El listado viene de la mas nueva a la mas vieja: si una materia aparece
    // dos veces (aplazo y despues aprobada), la primera es la que vale.
    if (yaVistas.has(materia.nro)) continue;
    yaVistas.add(materia.nro);

    reconocidas.push({
      materia,
      nota: fila.nota,
      fecha: fila.fecha,
      esAplazo: typeof fila.nota === "number" && fila.nota < 4,
    });
  }

  return { reconocidas, desconocidas, vacio: filas.length === 0 };
}

/** Traduce el resultado a lo que entiende el store. */
export function aProgreso(reconocidas: MateriaImportada[]): {
  aprobadas: number[];
  notas: Record<string, Nota>;
  aplazos: Record<string, NotaAplazo>;
} {
  const aprobadas: number[] = [];
  const notas: Record<string, Nota> = {};
  const aplazos: Record<string, NotaAplazo> = {};

  for (const item of reconocidas) {
    if (item.esAplazo) {
      aplazos[String(item.materia.nro)] = item.nota as NotaAplazo;
      continue;
    }
    aprobadas.push(item.materia.nro);
    notas[String(item.materia.nro)] = item.nota;
  }

  return { aprobadas, notas, aplazos };
}
