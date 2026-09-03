/**
 * Sincronizacion del progreso con el Google Drive del propio usuario.
 *
 * El archivo vive en `appDataFolder`: una carpeta oculta que solo esta app ve.
 * El usuario no la encuentra entre sus archivos y nadie mas puede leerla, asi
 * que el progreso queda privado sin que tengamos que montar ningun backend.
 *
 * Los scopes (`drive.appdata` + perfil) son de bajo riesgo: Google no exige
 * revisar la app para usarlos.
 */

import type { Nota, NotaAplazo } from "@/store/useProgressStore";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.appdata",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const DRIVE_FILE_NAME = "ucema-map-progreso.json";
const GIS_SRC = "https://accounts.google.com/gsi/client";

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

/** El progreso completo tal cual vive en el store, todas las carreras juntas. */
export interface CloudProgreso {
  aprobadas: Record<string, number[]>;
  cursando: Record<string, number[]>;
  notas: Record<string, Record<string, Nota>>;
  /** Opcional: los archivos guardados antes de esta version no lo traen. */
  aplazos?: Record<string, Record<string, NotaAplazo>>;
  carreraId?: string;
}

function getClientId(): string | null {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/** Sin Client ID configurado la app anda igual, pero 100% local: la UI de login se oculta. */
export function isSyncConfigured(): boolean {
  return getClientId() !== null;
}

/**
 * Carga el script de Google Identity Services la primera vez que hace falta
 * (no en el index.html, para no pedirle nada a Google a quien nunca se loguea).
 */
let gisPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;

  gisPromise = new Promise<void>((resolve, reject) => {
    // Un <script> que ya fallo no vuelve a emitir load ni error nunca mas: si lo
    // reusaramos, el reintento se quedaria esperando hasta el timeout y diria
    // "Google tardo demasiado" cuando en realidad esta bloqueado. Se descarta y
    // se pide de cero.
    document.querySelectorAll(`script[src="${GIS_SRC}"]`).forEach((s) => s.remove());

    const script = document.createElement("script");
    const timeout = setTimeout(
      () => reject(new Error("Google tardo demasiado en responder.")),
      10000
    );
    script.addEventListener("load", () => {
      clearTimeout(timeout);
      if (window.google?.accounts?.oauth2) resolve();
      else reject(new Error("El script de Google cargo pero no expuso la API."));
    });
    script.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("No se pudo cargar el script de Google."));
    });
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }).catch((e) => {
    gisPromise = null; // permitir reintentar
    throw e;
  });

  return gisPromise;
}

/**
 * Deja el script de Google listo antes de que el usuario toque nada.
 *
 * `requestAccessToken()` abre una ventana emergente, y los navegadores solo la
 * dejan abrir si sale del click del usuario. Si al hacer click todavia hay que
 * bajar el script de Google, el `await` corta esa cadena y el popup queda
 * bloqueado: el login falla al instante sin que se vea ninguna ventana.
 */
export function precargarGoogle(): void {
  void loadGis().catch(() => {
    /* Si falla, el error real se muestra recien cuando el usuario hace click. */
  });
}

/**
 * Traduce los codigos de Google a algo que se entienda, y deja el codigo crudo a
 * la vista.
 *
 * Las dos mitades hacen falta: sin la traduccion el usuario lee
 * "popup_failed_to_open" y no sabe que hacer; sin el codigo crudo, cuando alguien
 * reporta que "le da error" no hay con que distinguir un bloqueador de anuncios
 * de una cuenta que el administrador de su organizacion tiene restringida.
 */
export function explicarErrorDeLogin(e: unknown): string {
  const crudo = (e instanceof Error ? e.message : String(e ?? "")).trim();
  const t = crudo.toLowerCase();

  let explicacion: string;
  if (t.includes("popup_failed_to_open") || t.includes("failed to open")) {
    explicacion =
      "El navegador bloqueó la ventana de Google. Permití las ventanas emergentes para este sitio y probá de nuevo.";
  } else if (t.includes("popup_closed") || t.includes("closed")) {
    explicacion = "Se cerró la ventana de Google antes de terminar.";
  } else if (t.includes("no se pudo cargar el script")) {
    explicacion =
      "No se pudo cargar Google. Suele ser un bloqueador de anuncios o una extensión de privacidad: desactivala para este sitio.";
  } else if (t.includes("tardo demasiado")) {
    explicacion = "Google tardó demasiado en responder. Revisá tu conexión y probá de nuevo.";
  } else if (t.includes("admin_policy") || t.includes("policy_enforced")) {
    explicacion =
      "El administrador de tu cuenta bloquea las apps externas. Probá con una cuenta de Gmail personal.";
  } else if (t.includes("access_denied")) {
    explicacion = "Google no autorizó el acceso a esta cuenta. Probá con una cuenta de Gmail personal.";
  } else if (t.includes("origin") || t.includes("redirect_uri")) {
    explicacion = `Este dominio (${window.location.origin}) no está autorizado. Entrá desde https://ucemap.vercel.app`;
  } else {
    return crudo || "No se pudo iniciar sesión.";
  }

  return `${explicacion} (${crudo})`;
}

export interface TokenEmitido {
  token: string;
  /** Momento (epoch ms) en el que el token deja de servir. */
  expiraEn: number;
}

/**
 * Pide un access token. SIEMPRE sale de un gesto del usuario: el flujo de token
 * de Google abre una ventana emergente incluso con `prompt: ""`, asi que no hay
 * forma de renovarlo de fondo sin que al usuario le salte un popup.
 *
 * Los tokens duran ~1 hora y Google no entrega refresh tokens a las apps que
 * corren solo en el navegador: para una sesion permanente haria falta un backend.
 *
 * `email` preselecciona la cuenta usada la vez anterior y `prompt: ""` reutiliza
 * el consentimiento ya dado. Sin eso, Google pide elegir cuenta y aceptar los
 * permisos en cada login, que es su comportamiento por defecto.
 *
 * El callback se fija al crear el token client (no en cada pedido), asi que
 * creamos un client nuevo por llamada para resolver la promesa correcta.
 */
export async function requestToken(email?: string): Promise<TokenEmitido> {
  const clientId = getClientId();
  if (!clientId) throw new Error("Falta configurar VITE_GOOGLE_CLIENT_ID.");
  await loadGis();

  return new Promise<TokenEmitido>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      // `prompt: ""` va SIEMPRE: es "no pidas nada de mas". Sin el, Google
      // vuelve a mostrar la pantalla de permisos aunque el usuario ya los haya
      // dado, y tener que aceptarlos en cada login es insoportable. Si de verdad
      // hace falta consentimiento (permisos nuevos, acceso revocado), Google lo
      // muestra igual: esto no lo saltea, solo deja de forzarlo.
      //
      // `hint` ademas preselecciona la ultima cuenta usada, asi el selector ni
      // aparece. Cuando no hay cuenta recordada (recien se cerro sesion), el
      // selector si sale y esta bien: hay que elegir con cual entrar.
      prompt: "",
      ...(email ? { hint: email } : {}),
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description ?? response.error));
          return;
        }
        const segundos = Number(response.expires_in ?? 3600);
        resolve({ token: response.access_token, expiraEn: Date.now() + segundos * 1000 });
      },
      error_callback: (err) => reject(new Error(err.message ?? err.type ?? "Login cancelado.")),
    });
    client.requestAccessToken();
  });
}

export async function fetchUserInfo(token: string): Promise<GoogleUser> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener el perfil de Google.");
  const data = (await res.json()) as { name?: string; email?: string; picture?: string };
  return { name: data.name ?? "Usuario", email: data.email ?? "", picture: data.picture ?? "" };
}

async function findFileId(token: string): Promise<string | null> {
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    q: `name='${DRIVE_FILE_NAME}'`,
    fields: "files(id)",
  });
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo buscar el progreso en Drive.");
  const data = (await res.json()) as { files?: { id: string }[] };
  return data.files?.[0]?.id ?? null;
}

/** Baja el progreso guardado. Si el usuario nunca guardo, devuelve null. */
export async function driveLoad(token: string): Promise<CloudProgreso | null> {
  const fileId = await findFileId(token);
  if (!fileId) return null;
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo leer el progreso guardado en Drive.");
  return (await res.json()) as CloudProgreso;
}

async function createEmptyFile(token: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: DRIVE_FILE_NAME, parents: ["appDataFolder"] }),
  });
  if (!res.ok) throw new Error("No se pudo crear el archivo de progreso en Drive.");
  const created = (await res.json()) as { id: string };
  return created.id;
}

/**
 * Sobreescribe el archivo con el progreso completo.
 *
 * Crear el archivo y subir su contenido son dos pedidos separados a proposito:
 * `uploadType=multipart` necesita un body `multipart/related`, que no es lo que
 * arma FormData en el navegador.
 */
export async function driveSave(token: string, data: CloudProgreso): Promise<void> {
  const fileId = (await findFileId(token)) ?? (await createEmptyFile(token));
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) throw new Error("No se pudo guardar el progreso en Drive.");
}
