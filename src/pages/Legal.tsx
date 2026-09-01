import { Link } from "react-router-dom";
import { BRANDING, SURFACE } from "@/config/theme";
import { useThemeStore } from "@/store/useThemeStore";
import { Logo } from "@/components/ui/Logo";

const CONTACTO = "tomasbruner20@gmail.com";
const ACTUALIZADO = "29 de agosto de 2026";

/** Marco compartido por las paginas legales: encabezado, ancho de lectura y vuelta al inicio. */
function PaginaLegal({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const surface = SURFACE[mode];

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
        <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: surface.textPrimary }}>
          {titulo}
        </h1>
        <p className="text-xs mb-6" style={{ color: surface.textSecondary }}>
          Última actualización: {ACTUALIZADO}
        </p>
        <div
          className="flex flex-col gap-4 text-sm leading-relaxed"
          style={{ color: surface.textPrimary }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  return (
    <h2 className="text-base font-bold mt-3" style={{ color: SURFACE[mode].textPrimary }}>
      {children}
    </h2>
  );
}

export function Privacidad() {
  const mode = useThemeStore((s) => s.mode);
  const surface = SURFACE[mode];

  return (
    <PaginaLegal titulo="Política de privacidad">
      <p>
        UCEMA Map es un proyecto personal de un alumno de la Universidad del CEMA. No es un sitio
        oficial de la universidad ni tiene relación con ella. Esta página explica, sin vueltas, qué
        datos maneja la aplicación y qué hace con ellos.
      </p>

      <Titulo>La versión corta</Titulo>
      <p>
        No hay servidor. Tu progreso se guarda en tu propio Google Drive, en una carpeta privada que
        solo esta aplicación puede ver. Nadie más — ni siquiera quien desarrolla UCEMA Map — puede
        leerlo.
      </p>

      <Titulo>Qué datos se usan</Titulo>
      <ul className="list-disc pl-5 flex flex-col gap-1.5">
        <li>
          <strong>Tu progreso académico</strong>: las materias que marcás como aprobadas o cursando
          y las notas que cargás. Los ponés vos, a mano.
        </li>
        <li>
          <strong>Tu nombre, correo y foto de Google</strong>, solo si iniciás sesión. Se usan
          únicamente para mostrarte en la aplicación con qué cuenta estás trabajando.
        </li>
      </ul>
      <p>
        No se piden ni se guardan tu legajo, tu documento, tus notas oficiales ni ningún dato que la
        universidad tenga sobre vos.
      </p>

      <Titulo>Dónde se guarda</Titulo>
      <ul className="list-disc pl-5 flex flex-col gap-1.5">
        <li>
          <strong>Sin iniciar sesión</strong>: el progreso vive únicamente en la pestaña del
          navegador. Al cerrarla, no queda nada guardado en el dispositivo.
        </li>
        <li>
          <strong>Con sesión iniciada</strong>: se guarda en tu Google Drive, dentro de{" "}
          <code>appDataFolder</code>, una carpeta oculta reservada a esta aplicación. No aparece
          entre tus archivos y ninguna otra app puede abrirla.
        </li>
      </ul>
      <p>
        No existe una base de datos central: los datos nunca pasan por un servidor de UCEMA Map,
        porque no hay ninguno. La aplicación es una página web que habla directamente con Google
        desde tu navegador.
      </p>

      <Titulo>Qué permisos se piden y para qué</Titulo>
      <ul className="list-disc pl-5 flex flex-col gap-1.5">
        <li>
          <code>drive.appdata</code> — crear y modificar el archivo de progreso de esta aplicación.
          <strong> No da acceso al resto de tus archivos de Drive</strong>: es un permiso limitado a
          la carpeta propia de la app.
        </li>
        <li>
          <code>userinfo.profile</code> y <code>userinfo.email</code> — mostrar tu nombre, foto y
          correo dentro de la aplicación.
        </li>
      </ul>

      <Titulo>Qué no se hace</Titulo>
      <ul className="list-disc pl-5 flex flex-col gap-1.5">
        <li>No se venden, comparten ni transfieren tus datos a terceros.</li>
        <li>No se usan para publicidad ni para entrenar modelos.</li>
        <li>No hay analítica de terceros ni cookies de seguimiento.</li>
        <li>No se accede a ningún otro archivo de tu Google Drive.</li>
      </ul>

      <Titulo>Cómo revocar el acceso y borrar tus datos</Titulo>
      <p>
        Podés quitarle el permiso a la aplicación cuando quieras desde{" "}
        <a
          href="https://myaccount.google.com/permissions"
          target="_blank"
          rel="noreferrer"
          className="underline"
          style={{ color: "#0d9488" }}
        >
          la configuración de tu cuenta de Google
        </a>
        . Para borrar el archivo con tu progreso, en Drive entrá a Configuración → Administrar
        aplicaciones y eliminá los datos ocultos de la aplicación. También podés vaciar tu mapa
        desde la propia aplicación y guardar.
      </p>

      <Titulo>Contacto</Titulo>
      <p>
        Por dudas, correcciones o para pedir que se borre algo, escribí a{" "}
        <a href={`mailto:${CONTACTO}`} className="underline" style={{ color: "#0d9488" }}>
          {CONTACTO}
        </a>
        .
      </p>

      <p className="text-xs mt-4" style={{ color: surface.textSecondary }}>
        Ver también las{" "}
        <Link to="/terminos" className="underline">
          condiciones del servicio
        </Link>
        .
      </p>
    </PaginaLegal>
  );
}

export function Terminos() {
  const mode = useThemeStore((s) => s.mode);
  const surface = SURFACE[mode];

  return (
    <PaginaLegal titulo="Condiciones del servicio">
      <p>
        UCEMA Map es una herramienta gratuita hecha por un alumno para ayudar a planificar la
        carrera. Al usarla, aceptás estas condiciones.
      </p>

      <Titulo>No es un sitio oficial</Titulo>
      <p>
        Este proyecto no está afiliado a la Universidad del CEMA ni cuenta con su aval. Los planes de
        estudio se transcriben de los documentos públicos de la universidad, pero{" "}
        <strong>la información puede tener errores o quedar desactualizada</strong>.
      </p>

      <Titulo>Verificá antes de decidir</Titulo>
      <p>
        Las correlatividades, los créditos y los requisitos que se muestran son orientativos. Antes
        de inscribirte a una materia o tomar cualquier decisión académica, confirmá con la
        universidad. Quien desarrolla UCEMA Map no se responsabiliza por decisiones tomadas a partir
        de datos incorrectos.
      </p>

      <Titulo>El progreso lo cargás vos</Titulo>
      <p>
        Lo que marcás en el mapa es lo que vos declarás, no tu historia académica oficial. Sirve para
        organizarte, no como constancia de nada.
      </p>

      <Titulo>Disponibilidad</Titulo>
      <p>
        El servicio se ofrece "tal cual está", sin garantías de disponibilidad. Puede cambiar o dejar
        de funcionar en cualquier momento. Si iniciás sesión, tu progreso queda en tu propio Google
        Drive, así que sigue siendo tuyo aunque la aplicación desaparezca.
      </p>

      <Titulo>Uso responsable</Titulo>
      <p>
        Está permitido usar la aplicación para fines personales y educativos. No la uses para
        intentar acceder a datos de otras personas ni para nada que sea ilegal.
      </p>

      <Titulo>Contacto</Titulo>
      <p>
        Consultas y reportes de errores:{" "}
        <a href={`mailto:${CONTACTO}`} className="underline" style={{ color: "#0d9488" }}>
          {CONTACTO}
        </a>
        .
      </p>

      <p className="text-xs mt-4" style={{ color: surface.textSecondary }}>
        Ver también la{" "}
        <Link to="/privacidad" className="underline">
          política de privacidad
        </Link>
        .
      </p>
    </PaginaLegal>
  );
}
