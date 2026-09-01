import { useState } from "react";
import { Link } from "react-router-dom";
import { BRANDING, SURFACE } from "@/config/theme";
import { useThemeStore } from "@/store/useThemeStore";
import { Logo } from "@/components/ui/Logo";
import { isSyncConfigured, probarCargaDeGoogle } from "@/lib/googleDrive";

const CONTACTO = "tomasbruner20@gmail.com";
const ORIGEN_OFICIAL = "https://ucemap.vercel.app";

type Estado = "ok" | "falla" | "aviso";

interface Chequeo {
  nombre: string;
  estado: Estado;
  detalle: string;
  /** Que tiene que hacer el usuario si esto falla. */
  arreglo?: string;
}

/**
 * "Me da error al iniciar sesion" no alcanza para arreglar nada: el login pasa
 * por el script de Google, una ventana emergente y una llamada a Drive, y cada
 * uno falla distinto. Esta pagina prueba los pasos de a uno y deja un resumen
 * copiable, para que reportar el problema no dependa de saber abrir la consola.
 *
 * La prueba de la ventana emergente tiene que salir de un click de verdad: los
 * navegadores solo permiten abrir ventanas desde un gesto del usuario, asi que
 * no se puede correr sola al entrar a la pagina.
 */
export function Diagnostico() {
  const mode = useThemeStore((s) => s.mode);
  const surface = SURFACE[mode];
  const [chequeos, setChequeos] = useState<Chequeo[] | null>(null);
  const [corriendo, setCorriendo] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const correr = async () => {
    setCorriendo(true);
    setCopiado(false);

    // La ventana emergente va primero y sin await antes: cualquier espera
    // previa rompe la cadena del click y la daria por bloqueada sin serlo.
    const resultados: Chequeo[] = [popupChequeo()];

    resultados.push({
      nombre: "Dirección del sitio",
      estado: window.location.origin === ORIGEN_OFICIAL ? "ok" : "aviso",
      detalle: window.location.origin,
      arreglo:
        window.location.origin === ORIGEN_OFICIAL
          ? undefined
          : `Google solo autoriza ${ORIGEN_OFICIAL}. Entrá por esa dirección exacta.`,
    });

    resultados.push({
      nombre: "Conexión a internet",
      estado: navigator.onLine ? "ok" : "falla",
      detalle: navigator.onLine ? "Con conexión." : "El navegador dice que estás sin conexión.",
      arreglo: navigator.onLine ? undefined : "Conectate a internet y volvé a probar.",
    });

    resultados.push({
      nombre: "Login configurado",
      estado: isSyncConfigured() ? "ok" : "falla",
      detalle: isSyncConfigured()
        ? "La app tiene su identificador de Google."
        : "A esta copia de la app le falta el identificador de Google.",
      arreglo: isSyncConfigured() ? undefined : `Esto es un problema de la app. Avisale a ${CONTACTO}.`,
    });

    resultados.push(almacenamientoChequeo());

    const google = await probarCargaDeGoogle();
    resultados.push({
      nombre: "Script de Google",
      estado: google.ok ? "ok" : "falla",
      detalle: google.detalle,
      arreglo: google.ok
        ? undefined
        : "Casi siempre es un bloqueador de anuncios o una extensión de privacidad (uBlock, AdGuard, Ghostery, Brave Shields) o un antivirus con protección web. Desactivalo para este sitio, o probá en una ventana de incógnito.",
    });

    setChequeos(resultados);
    setCorriendo(false);
  };

  const resumen = chequeos ? textoParaCopiar(chequeos) : "";

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(resumen);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  const fallas = chequeos?.filter((c) => c.estado === "falla") ?? [];

  return (
    <div
      className="h-full w-full overflow-y-auto overscroll-contain"
      style={{ backgroundColor: surface.bg, WebkitOverflowScrolling: "touch" }}
    >
      <header className="px-5 sm:px-8 py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold hover:opacity-80 transition-opacity"
          style={{ color: surface.textPrimary }}
        >
          <Logo size={26} />
          {BRANDING.name}
        </Link>
      </header>

      <main className="px-5 sm:px-8 pb-16 max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: surface.textPrimary }}>
          ¿No podés iniciar sesión?
        </h1>
        <p className="text-sm mb-6" style={{ color: surface.textSecondary }}>
          Esta página prueba uno por uno los pasos del login y te dice cuál falla. No manda nada a
          ningún lado: todo pasa en tu navegador.
        </p>

        <button
          onClick={() => void correr()}
          disabled={corriendo}
          className="text-sm font-semibold rounded-lg px-4 py-2.5 bg-teal hover:bg-teal-light transition-colors text-white disabled:opacity-50"
        >
          {corriendo ? "Probando..." : chequeos ? "Probar de nuevo" : "Probar ahora"}
        </button>

        {chequeos && (
          <>
            <div className="flex flex-col gap-2 mt-6">
              {chequeos.map((c) => (
                <div
                  key={c.nombre}
                  className="rounded-lg border p-3"
                  style={{ backgroundColor: surface.panel, borderColor: surface.panelBorder }}
                >
                  <div className="flex items-start gap-2">
                    <span aria-hidden style={{ color: colorDe(c.estado), fontSize: 15, lineHeight: 1.2 }}>
                      {iconoDe(c.estado)}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold" style={{ color: surface.textPrimary }}>
                        {c.nombre}
                      </div>
                      <div className="text-xs mt-0.5 break-words" style={{ color: surface.textSecondary }}>
                        {c.detalle}
                      </div>
                      {c.arreglo && (
                        <div className="text-xs mt-1.5 leading-relaxed" style={{ color: colorDe(c.estado) }}>
                          {c.arreglo}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {fallas.length === 0 && (
              <p className="text-sm mt-4 leading-relaxed" style={{ color: surface.textPrimary }}>
                Todo dio bien acá. Si igual no podés entrar, el problema aparece recién cuando
                Google te pide la cuenta: copiá el resumen y mandámelo junto con lo que diga la
                pantalla de Google.
              </p>
            )}

            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => void copiar()}
                  className="text-xs font-semibold rounded-lg px-3 py-1.5 border transition-colors"
                  style={{
                    backgroundColor: surface.panel,
                    borderColor: surface.panelBorder,
                    color: surface.textPrimary,
                  }}
                >
                  {copiado ? "¡Copiado!" : "Copiar resumen"}
                </button>
                <a
                  href={`mailto:${CONTACTO}?subject=${encodeURIComponent(
                    "No puedo iniciar sesión en UCEMA Map"
                  )}&body=${encodeURIComponent(resumen)}`}
                  className="text-xs font-semibold rounded-lg px-3 py-1.5 border transition-colors"
                  style={{
                    backgroundColor: surface.panel,
                    borderColor: surface.panelBorder,
                    color: surface.textPrimary,
                  }}
                >
                  Mandarlo por mail
                </a>
              </div>
              <pre
                className="text-[11px] rounded-lg border p-3 overflow-x-auto whitespace-pre-wrap"
                style={{
                  backgroundColor: surface.panel,
                  borderColor: surface.panelBorder,
                  color: surface.textSecondary,
                }}
              >
                {resumen}
              </pre>
            </div>
          </>
        )}

        <p className="text-xs mt-8" style={{ color: surface.textSecondary }}>
          Acordate de que el login es opcional: sin iniciar sesión el mapa anda igual, lo único que
          no pasa es que tu progreso se guarde en tu Google Drive.{" "}
          <Link to="/" className="underline">
            Volver al inicio
          </Link>
          .
        </p>
      </main>
    </div>
  );
}

/** Abre y cierra una ventana de prueba. Tiene que correr dentro del click. */
function popupChequeo(): Chequeo {
  let ventana: Window | null = null;
  try {
    ventana = window.open("", "_blank", "width=200,height=200,left=-1000,top=-1000");
  } catch {
    ventana = null;
  }
  const bloqueada = !ventana || ventana.closed;
  ventana?.close();

  return {
    nombre: "Ventanas emergentes",
    estado: bloqueada ? "falla" : "ok",
    detalle: bloqueada
      ? "El navegador bloqueó la ventana de prueba."
      : "El navegador permite abrir ventanas.",
    arreglo: bloqueada
      ? "Google pide la cuenta en una ventana emergente. Permitilas para este sitio: en Chrome, el ícono a la derecha de la barra de direcciones, o Configuración → Privacidad y seguridad → Configuración de sitios → Ventanas emergentes."
      : undefined,
  };
}

function almacenamientoChequeo(): Chequeo {
  try {
    window.localStorage.setItem("ucema-map-test", "1");
    window.localStorage.removeItem("ucema-map-test");
    return {
      nombre: "Almacenamiento del navegador",
      estado: "ok",
      detalle: "Se puede guardar la sesión en este navegador.",
    };
  } catch {
    return {
      nombre: "Almacenamiento del navegador",
      estado: "falla",
      detalle: "El navegador no deja guardar datos de este sitio.",
      arreglo:
        "Suele pasar con las cookies bloqueadas del todo o en modo restringido. Permití los datos de sitio para ucemap.vercel.app.",
    };
  }
}

function colorDe(estado: Estado): string {
  if (estado === "ok") return "#16a34a";
  if (estado === "aviso") return "#d97706";
  return "#dc2626";
}

function iconoDe(estado: Estado): string {
  if (estado === "ok") return "✓";
  if (estado === "aviso") return "⚠";
  return "✕";
}

/**
 * El resumen incluye navegador y pantalla porque casi todos los reportes llegan
 * sin eso y hay que preguntarlo aparte.
 */
function textoParaCopiar(chequeos: Chequeo[]): string {
  const lineas = chequeos.map((c) => `${iconoDe(c.estado)} ${c.nombre}: ${c.detalle}`);
  return [
    "UCEMA Map - diagnóstico de login",
    ...lineas,
    "",
    `Navegador: ${navigator.userAgent}`,
    `Pantalla: ${window.innerWidth}x${window.innerHeight}`,
    `Idioma: ${navigator.language}`,
  ].join("\n");
}
