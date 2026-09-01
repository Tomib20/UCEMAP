#!/usr/bin/env node
/**
 * Genera public/robots.txt y public/sitemap.xml a partir del indice de carreras,
 * asi el sitemap nunca queda desfasado cuando se agrega o saca una carrera.
 *
 * Corre solo dentro de `npm run build`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITIO = "https://ucemap.vercel.app";

const index = JSON.parse(readFileSync(join(ROOT, "data", "carreras", "index.json"), "utf8"));

/** Fecha del build en formato YYYY-MM-DD (lo que espera <lastmod>). */
const hoy = new Date().toISOString().slice(0, 10);

const rutas = [
  { url: "/", prioridad: "1.0", frecuencia: "monthly" },
  ...index.carreras.map((c) => ({
    url: `/carrera/${c.id}`,
    prioridad: "0.8",
    frecuencia: "monthly",
  })),
  { url: "/privacidad", prioridad: "0.2", frecuencia: "yearly" },
  { url: "/terminos", prioridad: "0.2", frecuencia: "yearly" },
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rutas
  .map(
    (r) => `  <url>
    <loc>${SITIO}${r.url}</loc>
    <lastmod>${hoy}</lastmod>
    <changefreq>${r.frecuencia}</changefreq>
    <priority>${r.prioridad}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

const robots = `# UCEMA Map
User-agent: *
Allow: /

Sitemap: ${SITIO}/sitemap.xml
`;

writeFileSync(join(ROOT, "public", "sitemap.xml"), sitemap, "utf8");
writeFileSync(join(ROOT, "public", "robots.txt"), robots, "utf8");
console.log(`sitemap.xml con ${rutas.length} URLs + robots.txt`);
