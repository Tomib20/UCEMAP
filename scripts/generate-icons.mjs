#!/usr/bin/env node
/**
 * Genera los assets graficos de la app en public/: favicon SVG, iconos de la PWA
 * y la imagen de preview (og-image) que se ve al compartir el link.
 *
 * No usa dependencias: dibuja en un buffer RGBA (con supersampling para que no
 * queden bordes dentados) y arma el PNG a mano con zlib.
 *
 * Uso: node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public");

/* ── Paleta (la misma del mapa, config/theme.ts) ── */
const NAVY = [26, 39, 68];
const APROBADA = [134, 239, 172];
const OBLIGATORIA = [191, 219, 254];
const CURSANDO = [254, 240, 138];
const EDGE = [148, 163, 184];
const WHITE = [255, 255, 255];

/* ── Canvas RGBA con supersampling ── */

const SS = 3; // factor de supersampling

function createCanvas(w, h, bg) {
  const W = w * SS;
  const H = h * SS;
  const px = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    px[i * 4] = bg[0];
    px[i * 4 + 1] = bg[1];
    px[i * 4 + 2] = bg[2];
    px[i * 4 + 3] = bg.length > 3 ? bg[3] : 255;
  }
  return { w, h, W, H, px };
}

function blend(c, x, y, color, alpha = 1) {
  if (x < 0 || y < 0 || x >= c.W || y >= c.H || alpha <= 0) return;
  const i = (y * c.W + x) * 4;
  c.px[i] = c.px[i] * (1 - alpha) + color[0] * alpha;
  c.px[i + 1] = c.px[i + 1] * (1 - alpha) + color[1] * alpha;
  c.px[i + 2] = c.px[i + 2] * (1 - alpha) + color[2] * alpha;
  c.px[i + 3] = Math.max(c.px[i + 3], 255 * alpha);
}

/** Rectangulo con esquinas redondeadas (coordenadas en unidades logicas). */
function roundRect(c, x, y, w, h, r, color, alpha = 1) {
  const X = x * SS, Y = y * SS, W = w * SS, H = h * SS, R = r * SS;
  for (let py = Math.floor(Y); py < Math.ceil(Y + H); py++) {
    for (let px = Math.floor(X); px < Math.ceil(X + W); px++) {
      const dx = Math.max(X + R - px, px - (X + W - R), 0);
      const dy = Math.max(Y + R - py, py - (Y + H - R), 0);
      if (dx * dx + dy * dy <= R * R) blend(c, px, py, color, alpha);
    }
  }
}

function circle(c, cx, cy, r, color, alpha = 1) {
  const CX = cx * SS, CY = cy * SS, R = r * SS;
  for (let py = Math.floor(CY - R); py <= Math.ceil(CY + R); py++) {
    for (let px = Math.floor(CX - R); px <= Math.ceil(CX + R); px++) {
      const dx = px - CX, dy = py - CY;
      if (dx * dx + dy * dy <= R * R) blend(c, px, py, color, alpha);
    }
  }
}

/** Segmento de grosor `t` con extremos redondeados. */
function line(c, x1, y1, x2, y2, t, color, alpha = 1) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * SS);
  for (let i = 0; i <= steps; i++) {
    const f = steps === 0 ? 0 : i / steps;
    circle(c, x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, t / 2, color, alpha);
  }
}

/** Polilinea sobre un arco de circunferencia (para las curvas de las letras). */
function arc(c, cx, cy, r, a1, a2, t, color) {
  const steps = 40;
  let px = cx + r * Math.cos(a1), py = cy + r * Math.sin(a1);
  for (let i = 1; i <= steps; i++) {
    const a = a1 + (a2 - a1) * (i / steps);
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    line(c, px, py, x, y, t, color);
    px = x; py = y;
  }
}

/** Punta de flecha (triangulo relleno) apuntando de (x1,y1) hacia (x2,y2). */
function arrowHead(c, x1, y1, x2, y2, size, color) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  for (let d = 0; d < size; d += 0.25) {
    const half = ((size - d) / size) * (size * 0.5);
    const bx = x2 - Math.cos(ang) * d;
    const by = y2 - Math.sin(ang) * d;
    line(c, bx - Math.sin(ang) * half, by + Math.cos(ang) * half,
         bx + Math.sin(ang) * half, by - Math.cos(ang) * half, 0.8, color);
  }
}

/* ── Tipografia minima: solo las letras de "UCEMA MAP" ── */
// Cada glifo se dibuja en una caja de 100 (ancho util ~72) x 100 de alto.

const GLYPHS = {
  U: (c, x, y, s, t, col) => {
    line(c, x + 0.12 * s, y + 0.08 * s, x + 0.12 * s, y + 0.62 * s, t, col);
    line(c, x + 0.60 * s, y + 0.08 * s, x + 0.60 * s, y + 0.62 * s, t, col);
    arc(c, x + 0.36 * s, y + 0.62 * s, 0.24 * s, Math.PI, 0, t, col);
  },
  C: (c, x, y, s, t, col) => {
    // Un solo arco, abierto del lado derecho (de ~58 grados a ~302 grados).
    arc(c, x + 0.46 * s, y + 0.46 * s, 0.37 * s, Math.PI * 0.30, Math.PI * 1.70, t, col);
  },
  E: (c, x, y, s, t, col) => {
    line(c, x + 0.14 * s, y + 0.08 * s, x + 0.14 * s, y + 0.84 * s, t, col);
    line(c, x + 0.14 * s, y + 0.08 * s, x + 0.60 * s, y + 0.08 * s, t, col);
    line(c, x + 0.14 * s, y + 0.46 * s, x + 0.54 * s, y + 0.46 * s, t, col);
    line(c, x + 0.14 * s, y + 0.84 * s, x + 0.60 * s, y + 0.84 * s, t, col);
  },
  M: (c, x, y, s, t, col) => {
    line(c, x + 0.10 * s, y + 0.84 * s, x + 0.10 * s, y + 0.08 * s, t, col);
    line(c, x + 0.10 * s, y + 0.08 * s, x + 0.40 * s, y + 0.56 * s, t, col);
    line(c, x + 0.40 * s, y + 0.56 * s, x + 0.70 * s, y + 0.08 * s, t, col);
    line(c, x + 0.70 * s, y + 0.08 * s, x + 0.70 * s, y + 0.84 * s, t, col);
  },
  A: (c, x, y, s, t, col) => {
    line(c, x + 0.10 * s, y + 0.84 * s, x + 0.38 * s, y + 0.08 * s, t, col);
    line(c, x + 0.38 * s, y + 0.08 * s, x + 0.66 * s, y + 0.84 * s, t, col);
    line(c, x + 0.21 * s, y + 0.55 * s, x + 0.55 * s, y + 0.55 * s, t, col);
  },
  P: (c, x, y, s, t, col) => {
    line(c, x + 0.14 * s, y + 0.08 * s, x + 0.14 * s, y + 0.84 * s, t, col);
    line(c, x + 0.14 * s, y + 0.08 * s, x + 0.42 * s, y + 0.08 * s, t, col);
    arc(c, x + 0.42 * s, y + 0.29 * s, 0.21 * s, -Math.PI / 2, Math.PI / 2, t, col);
    line(c, x + 0.14 * s, y + 0.50 * s, x + 0.42 * s, y + 0.50 * s, t, col);
  },
  " ": () => {},
};

/** Ancho de avance de cada letra, en fracciones del alto `s`. */
const ADVANCE = { U: 0.78, C: 0.94, E: 0.74, M: 0.86, A: 0.80, P: 0.72, " ": 0.36 };

function drawText(c, text, x, y, s, t, col) {
  let cx = x;
  for (const ch of text) {
    (GLYPHS[ch] ?? GLYPHS[" "])(c, cx, y, s, t, col);
    cx += (ADVANCE[ch] ?? 0.8) * s;
  }
  return cx - x; // ancho total dibujado
}

function textWidth(text, s) {
  let w = 0;
  for (const ch of text) w += (ADVANCE[ch] ?? 0.8) * s;
  return w;
}

/* ── PNG encoder ── */

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Baja el supersampling y devuelve el PNG. */
function encodePng(c) {
  const { w, h, W, px } = c;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  let p = 0;
  for (let y = 0; y < h; y++) {
    raw[p++] = 0; // filtro "none"
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * W + (x * SS + sx)) * 4;
          r += px[i]; g += px[i + 1]; b += px[i + 2]; a += px[i + 3];
        }
      }
      const n = SS * SS;
      raw[p++] = Math.round(r / n);
      raw[p++] = Math.round(g / n);
      raw[p++] = Math.round(b / n);
      raw[p++] = Math.round(a / n);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ── Composiciones ── */

/**
 * Icono: tres materias encadenadas (aprobada -> disponible -> cursando), que es
 * exactamente lo que muestra el mapa.
 *
 * `bleed` = true para el icono maskable (fondo hasta el borde, contenido dentro
 * de la zona segura del 80%).
 */
function drawIcon(size, { bleed = false } = {}) {
  const c = createCanvas(size, size, bleed ? NAVY : [0, 0, 0, 0]);
  const u = size / 100; // unidad relativa
  if (!bleed) roundRect(c, 0, 0, size, size, size * 0.22, NAVY);

  const scale = bleed ? 0.78 : 1; // zona segura del maskable
  const cx = size / 2, cy = size / 2;
  const at = (x, y) => [cx + (x - 50) * u * scale, cy + (y - 50) * u * scale];

  const nodes = [
    { pos: [26, 24], color: APROBADA },
    { pos: [50, 50], color: OBLIGATORIA },
    { pos: [74, 76], color: CURSANDO },
  ];
  const nw = 34 * u * scale, nh = 15 * u * scale, nr = 5 * u * scale;

  // Aristas entre nodo y nodo
  for (let i = 0; i < nodes.length - 1; i++) {
    const [x1, y1] = at(...nodes[i].pos);
    const [x2, y2] = at(...nodes[i + 1].pos);
    line(c, x1, y1 + nh / 2, x2, y2 - nh / 2, 2.4 * u * scale, EDGE, 0.85);
    arrowHead(c, x1, y1 + nh / 2, x2, y2 - nh / 2, 5 * u * scale, EDGE);
  }
  for (const n of nodes) {
    const [x, y] = at(...n.pos);
    roundRect(c, x - nw / 2, y - nh / 2, nw, nh, nr, n.color);
  }
  return c;
}

/** Imagen de preview 1200x630: titulo + mini mapa. */
function drawOgImage() {
  const W = 1200, H = 630;
  const c = createCanvas(W, H, NAVY);

  // Trama de puntos como el fondo del grafo
  for (let y = 40; y < H; y += 40) {
    for (let x = 40; x < W; x += 40) circle(c, x, y, 1.6, WHITE, 0.07);
  }

  const s = 132;
  const title = "UCEMA MAP";
  const tw = textWidth(title, s);
  drawText(c, title, (W - tw) / 2, 120, s, 14, WHITE);

  // Subrayado dorado
  roundRect(c, (W - tw) / 2 + 6, 262, tw - 12, 8, 4, [253, 224, 71]);

  // Mini mapa: 4 columnas de materias, con aristas encadenadas
  const cols = 4, rows = 3;
  const nw = 150, nh = 42, gapX = 96, gapY = 62;
  const totalW = cols * nw + (cols - 1) * (gapX - nw + nw) - (gapX - 0);
  const startX = (W - (cols * nw + (cols - 1) * gapX)) / 2;
  const startY = 340;
  const BLOQUEADA = [100, 116, 139];
  const colors = [APROBADA, APROBADA, OBLIGATORIA, OBLIGATORIA, CURSANDO, OBLIGATORIA];
  const pos = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const x = startX + col * (nw + gapX);
      const y = startY + row * (nh + gapY);
      pos.push({ x, y, col, row });
    }
  }
  // Aristas: de cada columna a la siguiente
  for (const p of pos) {
    if (p.col === cols - 1) continue;
    const target = pos.find((q) => q.col === p.col + 1 && q.row === (p.row + p.col) % rows);
    if (!target) continue;
    line(c, p.x + nw, p.y + nh / 2, target.x, target.y + nh / 2, 3, EDGE, 0.5);
    arrowHead(c, p.x + nw, p.y + nh / 2, target.x, target.y + nh / 2, 12, [148, 163, 184]);
  }
  pos.forEach((p, i) => {
    // La ultima columna representa lo que todavia esta bloqueado.
    const color = p.col === cols - 1 ? BLOQUEADA : colors[i % colors.length];
    roundRect(c, p.x, p.y, nw, nh, 12, color);
  });

  void totalW;
  return c;
}

/* ── Favicon SVG (vectorial, mismo dibujo que el icono) ── */

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#1a2744"/>
  <g stroke="#94a3b8" stroke-width="2.4" stroke-linecap="round">
    <line x1="26" y1="31" x2="50" y2="43"/>
    <line x1="50" y1="57" x2="74" y2="69"/>
  </g>
  <g>
    <rect x="9" y="17" width="34" height="15" rx="5" fill="#86efac"/>
    <rect x="33" y="43" width="34" height="15" rx="5" fill="#bfdbfe"/>
    <rect x="57" y="69" width="34" height="15" rx="5" fill="#fef08a"/>
  </g>
</svg>
`;

/* ── Main ── */

mkdirSync(OUT, { recursive: true });

const targets = [
  ["pwa-64x64.png", () => drawIcon(64)],
  ["pwa-192x192.png", () => drawIcon(192)],
  ["pwa-512x512.png", () => drawIcon(512)],
  ["maskable-icon-512x512.png", () => drawIcon(512, { bleed: true })],
  ["apple-touch-icon-180x180.png", () => drawIcon(180, { bleed: true })],
  ["og-image.png", () => drawOgImage()],
];

for (const [name, make] of targets) {
  const png = encodePng(make());
  writeFileSync(join(OUT, name), png);
  console.log(`${name.padEnd(30)} ${(png.length / 1024).toFixed(1)} kB`);
}

writeFileSync(join(OUT, "favicon.svg"), FAVICON_SVG, "utf8");
console.log("favicon.svg".padEnd(30) + `${(FAVICON_SVG.length / 1024).toFixed(1)} kB`);
