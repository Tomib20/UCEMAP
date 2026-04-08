/**
 * Backend Google Sheets + Google Forms (estilo FIUBA-Map).
 *
 * Lectura: GET a la API de Google Sheets con la API key restringida por dominio.
 * Escritura: POST con `mode: "no-cors"` a Google Forms publicos. No podemos
 * leer la respuesta, pero la fila se inserta igual.
 */

import {
  GOOGLE_API_KEY,
  REGISTRO_FORM,
  SHEETS,
  SHEETS_BASE,
  USER_FORM,
} from "./sheetsConfig";
import type { Nota } from "@/store/useProgressStore";

/** Forma del JSON guardado en la columna "mapa" del sheet "registros". */
export interface CarreraMapa {
  aprobadas: number[];
  cursando: number[];
  notas: Record<string, Nota>;
}

export interface RegistroRemoto {
  carreraId: string;
  mapa: CarreraMapa;
}

export interface UsuarioRemoto {
  usuario: string;
  carreraActual: string | null;
  registros: RegistroRemoto[];
  /** True si el usuario ya existia en el sheet `usuarios` (no es signup nuevo). */
  isKnown: boolean;
}

interface SheetsValuesResponse {
  range?: string;
  majorDimension?: string;
  values?: string[][];
  error?: { message: string };
}

async function fetchSheet(sheetName: string, range: string): Promise<string[][]> {
  const url = `${SHEETS_BASE}/${encodeURIComponent(sheetName)}!${range}?key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sheets API error ${res.status}`);
  }
  const data: SheetsValuesResponse = await res.json();
  if (data.error) {
    throw new Error(`Sheets API: ${data.error.message}`);
  }
  return data.values ?? [];
}

/**
 * Lee la spreadsheet entera y devuelve la info del usuario.
 *
 * Como Google Forms appendea filas, hay multiples filas por (usuario, carrera).
 * Tomamos la mas reciente (la ultima del array) por cada combinacion.
 *
 * Siempre devuelve un UsuarioRemoto. `isKnown` indica si el usuario ya existia
 * en alguno de los dos sheets (es decir, no es un signup brand new).
 */
export async function fetchUsuario(usuario: string): Promise<UsuarioRemoto> {
  const usuarioLower = usuario.trim().toLowerCase();

  const [usuariosRows, registrosRows] = await Promise.all([
    fetchSheet(SHEETS.usuarios, "A:C"),
    fetchSheet(SHEETS.registros, "A:D"),
  ]);

  // Skip header row. Buscamos la ultima entrada del usuario en "usuarios".
  let carreraActual: string | null = null;
  let foundUsuario = false;
  for (let i = usuariosRows.length - 1; i >= 1; i--) {
    const row = usuariosRows[i];
    if (!row || row.length < 2) continue;
    if ((row[1] ?? "").trim().toLowerCase() === usuarioLower) {
      carreraActual = (row[2] ?? "").trim() || null;
      foundUsuario = true;
      break;
    }
  }

  // Buscamos la ultima version de cada (usuario, carrera) en "registros".
  const registrosMap = new Map<string, CarreraMapa>();
  let foundEnRegistros = false;
  for (let i = 1; i < registrosRows.length; i++) {
    const row = registrosRows[i];
    if (!row || row.length < 4) continue;
    if ((row[1] ?? "").trim().toLowerCase() !== usuarioLower) continue;
    const carreraId = (row[2] ?? "").trim();
    const mapaRaw = row[3] ?? "";
    if (!carreraId || !mapaRaw) continue;
    try {
      const mapa = JSON.parse(mapaRaw) as CarreraMapa;
      // Sobreescribe entradas previas → la ultima fila gana.
      registrosMap.set(carreraId, mapa);
      foundEnRegistros = true;
    } catch {
      // Ignoramos filas con JSON invalido.
    }
  }

  const registros: RegistroRemoto[] = Array.from(registrosMap.entries()).map(
    ([carreraId, mapa]) => ({ carreraId, mapa })
  );

  return {
    usuario: usuarioLower,
    carreraActual,
    registros,
    isKnown: foundUsuario || foundEnRegistros,
  };
}

/** Postea al form de usuario (registra la carrera actual). */
export async function postUsuario(usuario: string, carreraActual: string): Promise<void> {
  const formData = new FormData();
  formData.append(USER_FORM.entries.usuario, usuario);
  formData.append(USER_FORM.entries.carreraActual, carreraActual);
  await fetch(USER_FORM.url, {
    method: "POST",
    mode: "no-cors",
    body: formData,
  });
}

/** Postea al form de registro (mapa de una carrera). */
export async function postRegistro(
  usuario: string,
  carreraId: string,
  mapa: CarreraMapa
): Promise<void> {
  const formData = new FormData();
  formData.append(REGISTRO_FORM.entries.usuario, usuario);
  formData.append(REGISTRO_FORM.entries.carrera, carreraId);
  formData.append(REGISTRO_FORM.entries.mapa, JSON.stringify(mapa));
  await fetch(REGISTRO_FORM.url, {
    method: "POST",
    mode: "no-cors",
    body: formData,
  });
}
