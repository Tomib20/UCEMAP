#!/usr/bin/env node
/**
 * Escribe un HTML por ruta dentro de dist/, con su titulo, su descripcion y su
 * canonical ya puestos.
 *
 * La app es una SPA: el servidor manda siempre el mismo index.html y el titulo
 * de cada carrera lo pone JavaScript recien despues. Un buscador que no espera
 * a que corra el JS ve 16 direcciones con el mismo titulo y la misma
 * descripcion, y las trata como la misma pagina repetida.
 *
 * Esto no reemplaza a la SPA: cada archivo es el mismo index.html con las
 * etiquetas del <head> cambiadas, asi que React arranca igual y la navegacion
 * interna sigue siendo instantanea. Lo unico que cambia es lo que se lee antes
 * de ejecutar nada.
 *
 * Corre DESPUES de `vite build`, para partir del index.html ya compilado (con
 * los nombres con hash de los assets) y para que el service worker no precachee
 * estos archivos: son 16 copias de lo mismo y no aportan nada al cache.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const SITIO = "https://ucemap.vercel.app";

const index = JSON.parse(readFileSync(join(ROOT, "data", "carreras", "index.json"), "utf8"));

/** Los textos van adentro de atributos HTML, asi que las comillas tienen que salir. */
function escapar(texto) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const rutas = [
  {
    ruta: "/",
    archivo: "index.html",
    titulo: "UCEMA Map - Mapa de Correlatividades",
    descripcion:
      "Mapa interactivo de correlatividades de las carreras de la Universidad del CEMA. Segui tu avance materia por materia y mira que se te habilita.",
  },
  ...index.carreras.map((c) => ({
    ruta: `/carrera/${c.id}`,
    archivo: join("carrera", `${c.id}.html`),
    // Mismo formato que document.title en AppLayout, para que el titulo no
    // cambie delante del usuario cuando arranca el JS.
    titulo: `${c.nombre} - Correlatividades UCEMA | UCEMA Map`,
    descripcion: `Correlativas de ${c.nombre} en la UCEMA: el plan completo como mapa, materia por materia. Marca lo que aprobaste y mira que se te habilita.`,
  })),
  {
    ruta: "/privacidad",
    archivo: "privacidad.html",
    titulo: "Politica de privacidad | UCEMA Map",
    descripcion:
      "Que datos usa UCEMA Map y que hace con ellos. Sin servidor: tu progreso se guarda en tu propio Google Drive.",
  },
  {
    ruta: "/terminos",
    archivo: "terminos.html",
    titulo: "Condiciones del servicio | UCEMA Map",
    descripcion:
      "Condiciones de uso de UCEMA Map. Proyecto no oficial, sin relacion con la Universidad del CEMA.",
  },
];

const plantilla = readFileSync(join(DIST, "index.html"), "utf8");

/** Cambia el contenido de un <meta> ya existente, sin tocar el resto del head. */
function reemplazarMeta(html, atributo, nombre, valor) {
  const patron = new RegExp(
    `(<meta\\s+${atributo}="${nombre}"\\s+content=")[^"]*(")`,
    "i"
  );
  if (!patron.test(html)) {
    throw new Error(`No se encontro el meta ${atributo}="${nombre}" en dist/index.html`);
  }
  return html.replace(patron, `$1${escapar(valor)}$2`);
}

for (const r of rutas) {
  let html = plantilla;
  const url = `${SITIO}${r.ruta}`;

  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapar(r.titulo)}</title>`);
  html = reemplazarMeta(html, "name", "description", r.descripcion);
  html = reemplazarMeta(html, "property", "og:title", r.titulo);
  html = reemplazarMeta(html, "property", "og:description", r.descripcion);
  html = reemplazarMeta(html, "property", "og:url", url);
  html = reemplazarMeta(html, "name", "twitter:title", r.titulo);
  html = reemplazarMeta(html, "name", "twitter:description", r.descripcion);

  // El canonical le dice al buscador cual es la direccion buena de esta pagina.
  // Sin el, 16 archivos casi identicos se leen como duplicados entre si.
  html = html.replace(
    /<title>/i,
    `<link rel="canonical" href="${url}" />\n    <title>`
  );

  const destino = join(DIST, r.archivo);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, html, "utf8");
}

console.log(`prerender: ${rutas.length} HTML con titulo, descripcion y canonical propios`);
