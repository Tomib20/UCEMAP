#!/usr/bin/env node
/**
 * Valida los JSONs de carreras contra el contrato que espera la app
 * (ver src/types/carrera.ts).
 *
 * Uso:
 *   node scripts/validate-carreras.mjs          # solo las carreras del index.json
 *   node scripts/validate-carreras.mjs --all    # incluye tambien los planes legacy
 *
 * Sale con codigo 1 si encuentra errores (sirve para CI / pre-deploy).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CARRERAS_DIR = join(ROOT, "data", "carreras");
const PLANES_DIR = join(ROOT, "docs", "planes-de-estudio");

const GRUPOS_VALIDOS = new Set(["obligatoria", "topico", "tesis", "requisito", "taller"]);
const CAMPOS_CARRERA = ["id", "nombre", "plan", "titulo", "anios", "materias", "topicos_requeridos"];

const incluirLegacy = process.argv.includes("--all");

/** Acumulador de problemas de un archivo. */
function nuevoReporte(archivo) {
  return { archivo, errores: [], avisos: [] };
}

function leerJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/* -- Validacion de una carrera -- */

function validarCarrera(carrera, rep) {
  for (const campo of CAMPOS_CARRERA) {
    if (carrera[campo] === undefined || carrera[campo] === null) {
      rep.errores.push(`falta el campo "${campo}"`);
    }
  }
  if (!Array.isArray(carrera.materias)) {
    rep.errores.push('"materias" no es un array');
    return;
  }
  if (carrera.materias.length === 0) {
    rep.errores.push("no tiene materias");
    return;
  }

  const anios = Number(carrera.anios) || 0;
  const porNro = new Map();

  for (const m of carrera.materias) {
    const id = `${m.nro ?? "?"} (${m.nombre ?? "sin nombre"})`;

    if (typeof m.nro !== "number" || !Number.isFinite(m.nro)) {
      rep.errores.push(`${id}: "nro" tiene que ser un numero`);
      continue;
    }
    if (porNro.has(m.nro)) {
      rep.errores.push(`nro ${m.nro} duplicado: "${porNro.get(m.nro).nombre}" y "${m.nombre}"`);
      continue;
    }
    porNro.set(m.nro, m);

    if (typeof m.nombre !== "string" || m.nombre.trim() === "") {
      rep.errores.push(`${id}: "nombre" vacio`);
    }
    if (!GRUPOS_VALIDOS.has(m.grupo)) {
      rep.errores.push(`${id}: grupo invalido "${m.grupo}" (validos: ${[...GRUPOS_VALIDOS].join(", ")})`);
    }
    if (![1, 2].includes(m.cuatrimestre)) {
      rep.errores.push(`${id}: cuatrimestre invalido "${m.cuatrimestre}" (tiene que ser 1 o 2)`);
    }
    if (typeof m.creditos !== "number" || m.creditos < 0) {
      rep.errores.push(`${id}: "creditos" invalido "${m.creditos}"`);
    }
    if (!Array.isArray(m.correlativas)) {
      rep.errores.push(`${id}: "correlativas" no es un array`);
    }

    // El layout arma una columna por anio: si el anio se sale del rango, la
    // materia aparece en una columna fantasma o directamente descolgada.
    if (m.grupo === "obligatoria") {
      if (typeof m.anio !== "number" || m.anio < 1) {
        rep.errores.push(`${id}: "anio" invalido "${m.anio}"`);
      } else if (anios > 0 && m.anio > anios) {
        rep.avisos.push(`${id}: anio ${m.anio} > anios de la carrera (${anios})`);
      }
    }
  }

  // Correlativas: que existan, que no se apunten a si mismas ni esten repetidas.
  for (const m of carrera.materias) {
    if (!Array.isArray(m.correlativas)) continue;
    const vistas = new Set();
    for (const nro of m.correlativas) {
      const id = `${m.nro} (${m.nombre})`;
      if (typeof nro !== "number") {
        rep.errores.push(`${id}: correlativa "${nro}" no es un numero`);
        continue;
      }
      if (nro === m.nro) {
        rep.errores.push(`${id}: se tiene a si misma como correlativa`);
        continue;
      }
      if (vistas.has(nro)) {
        rep.avisos.push(`${id}: correlativa ${nro} repetida`);
        continue;
      }
      vistas.add(nro);
      if (!porNro.has(nro)) {
        rep.errores.push(`${id}: correlativa ${nro} no existe en el plan`);
      }
    }
  }

  detectarCiclos(carrera.materias, porNro, rep);

  // Cupos declarados vs materias realmente cargadas.
  const contar = (grupo) => carrera.materias.filter((m) => m.grupo === grupo).length;
  const topicos = contar("topico");
  const talleres = contar("taller");
  if (typeof carrera.topicos_requeridos === "number" && carrera.topicos_requeridos > topicos) {
    rep.errores.push(`topicos_requeridos (${carrera.topicos_requeridos}) > topicos cargados (${topicos})`);
  }
  if (typeof carrera.talleres_requeridos === "number" && carrera.talleres_requeridos > talleres) {
    rep.errores.push(`talleres_requeridos (${carrera.talleres_requeridos}) > talleres cargados (${talleres})`);
  }
  if (contar("obligatoria") === 0) {
    rep.errores.push("no tiene ninguna materia obligatoria");
  }
}

/**
 * Un ciclo en las correlativas deja materias bloqueadas para siempre:
 * getMateriaStatus nunca las marca disponibles porque se esperan entre si.
 */
function detectarCiclos(materias, porNro, rep) {
  const EN_PROCESO = 1;
  const LISTO = 2;
  const estado = new Map();
  const camino = [];

  function visitar(nro) {
    estado.set(nro, EN_PROCESO);
    camino.push(nro);
    for (const prereq of porNro.get(nro)?.correlativas ?? []) {
      if (!porNro.has(prereq)) continue;
      if (estado.get(prereq) === EN_PROCESO) {
        const desde = camino.indexOf(prereq);
        const ciclo = camino
          .slice(desde)
          .concat(prereq)
          .map((n) => `${n} (${porNro.get(n).nombre})`)
          .join(" -> ");
        rep.errores.push(`ciclo de correlativas: ${ciclo}`);
      } else if (estado.get(prereq) !== LISTO) {
        visitar(prereq);
      }
    }
    camino.pop();
    estado.set(nro, LISTO);
  }

  for (const m of materias) {
    if (typeof m.nro === "number" && !estado.has(m.nro)) visitar(m.nro);
  }
}

/* -- Validacion del index -- */

function validarIndex(index, rep) {
  if (!Array.isArray(index.carreras)) {
    rep.errores.push('"carreras" no es un array');
    return [];
  }
  const ids = new Set();
  for (const entry of index.carreras) {
    if (!entry.id || !entry.nombre || !entry.archivo) {
      rep.errores.push(`entrada incompleta: ${JSON.stringify(entry)}`);
      continue;
    }
    if (ids.has(entry.id)) rep.errores.push(`id duplicado "${entry.id}"`);
    ids.add(entry.id);
    if (!existsSync(join(CARRERAS_DIR, entry.archivo))) {
      rep.errores.push(`"${entry.id}": el archivo ${entry.archivo} no existe`);
    }
    if (entry.planEstudio && !existsSync(join(PLANES_DIR, entry.planEstudio))) {
      rep.avisos.push(`"${entry.id}": el PDF ${entry.planEstudio} no esta en docs/planes-de-estudio/`);
    }
  }
  return index.carreras;
}

/* -- Main -- */

const reportes = [];

const indexRep = nuevoReporte("index.json");
const index = leerJson(join(CARRERAS_DIR, "index.json"));
const entradas = validarIndex(index, indexRep);
reportes.push(indexRep);

const archivosIndex = new Map(entradas.map((e) => [e.archivo, e]));
const archivos = readdirSync(CARRERAS_DIR)
  .filter((f) => f.endsWith(".json") && f !== "index.json" && f !== "schema.json")
  .filter((f) => incluirLegacy || archivosIndex.has(f))
  .sort();

for (const archivo of archivos) {
  const entrada = archivosIndex.get(archivo);
  const rep = nuevoReporte(entrada ? archivo : `${archivo} [legacy]`);
  try {
    const carrera = leerJson(join(CARRERAS_DIR, archivo));
    validarCarrera(carrera, rep);
    if (entrada && carrera.id !== entrada.id) {
      rep.errores.push(`el id del JSON ("${carrera.id}") no coincide con el del index ("${entrada.id}")`);
    }
  } catch (e) {
    rep.errores.push(`no se pudo leer: ${e.message}`);
  }
  reportes.push(rep);
}

let errores = 0;
let avisos = 0;
for (const rep of reportes) {
  errores += rep.errores.length;
  avisos += rep.avisos.length;
  if (rep.errores.length === 0 && rep.avisos.length === 0) {
    console.log(`OK   ${rep.archivo}`);
    continue;
  }
  console.log(`${rep.errores.length > 0 ? "FAIL" : "WARN"} ${rep.archivo}`);
  for (const e of rep.errores) console.log(`       error: ${e}`);
  for (const a of rep.avisos) console.log(`       aviso: ${a}`);
}

console.log(
  `\n${reportes.length} archivos validados - ${errores} error(es), ${avisos} aviso(s)` +
    (incluirLegacy ? "" : "  (los planes legacy se validan con --all)")
);
process.exit(errores > 0 ? 1 : 0);
