# Arquitectura

Notas tecnicas de UCEMA Map: como esta armado, que decisiones se tomaron y por que.
Para instalar y correr el proyecto, ver el [README](README.md).

## Comandos

- `npm run dev` — levanta el dev server (Vite)
- `npm run validate` — valida los JSON de carreras (`scripts/validate-carreras.mjs`)
- `node scripts/generate-icons.mjs` — regenera los iconos de la PWA y el og-image en `public/`
- `npx vite build` — build de produccion (verificar errores rapido, no usa tsc)
- `npm run build` — build completo: validate + type-check (tsc) + vite

## Stack

- React 19 + TypeScript + Vite 8
- **@xyflow/react** (React Flow v12) — grafo interactivo de nodos
- **Zustand** — estado global con persistencia en localStorage
- **Tailwind CSS v4** — estilos utility-first via @tailwindcss/vite plugin
- **Manrope** — tipografia (Google Fonts, cargada en index.html)
- **Google Identity Services + Google Drive** — sync opcional del progreso en el `appDataFolder` del usuario (sin backend propio)

## Arquitectura

```
src/
  config/theme.ts        — colores (light/dark), branding, constantes de layout
  types/carrera.ts       — tipos: Materia, Carrera, MateriaStatus, MateriaGrupo
  lib/
    googleDrive.ts       — login con Google (GIS) + leer/guardar el progreso en Drive
  store/
    useProgressStore.ts  — aprobadas, cursando, notas por carrera (persiste en sessionStorage)
    useThemeStore.ts     — light/dark mode (persiste en localStorage)
    useUserStore.ts      — sesion de Google, token en memoria, guardado en Drive
    syncWatcher.ts       — observa progressStore y agenda el guardado automatico
  utils/
    layoutGraph.ts       — posiciona nodos en grilla por año (5 cols) + electivas
    materiaStatus.ts     — calcula status: aprobada > cursando > disponible > bloqueada
    prerequisiteChain.ts — adjacency maps, BFS ancestros/descendientes
  components/
    graph/
      GraphView.tsx      — wrapper ReactFlow con highlight, drag vertical, fitView
      MateriaNode.tsx    — nodo custom (memo), lee status del store
      Legend.tsx          — leyenda de colores flotante
    layout/Header.tsx    — header con branding, login UI, boton Guardar, toggle dark mode
    ui/
      MateriaDetail.tsx  — sidebar derecha con detalle, botones cursando/aprobada, notas
      ProgressBar.tsx    — isla flotante inferior con barra unificada + promedio
      Tour.tsx           — modal "Como usar el mapa" (primera visita + boton "?")
  pages/Welcome.tsx      — home con la grilla de carreras (ruta "/" sin sesion)
  pages/MapPage.tsx      — composicion: GraphView + ProgressBar + MateriaDetail
  App.tsx                — carga JSON de carrera, auto-login, beforeunload warning
  hooks/
    useIsMobile.ts       — hook de matchMedia para breakpoint mobile (768px)
    useInstallPrompt.ts  — evento beforeinstallprompt para el boton "Instalar app"
  pages/MapPage.tsx      — composicion: GraphView + ProgressBar + MateriaDetail + SearchPalette
  App.tsx                — BrowserRouter con rutas /carrera/:carreraId
data/
  carreras/
    index.json                     — indice de 12 carreras activas
    ingenieria-informatica.json    — 54 materias (plan 2026)
    abogacia.json, actuario.json, business-administration.json,
    contador-publico.json, licenciatura-*.json  — 11 carreras mas
    *-old.json, *-m.json, *-2025.json           — planes legacy (no en index)
  schema.json                      — JSON Schema espejo de types/carrera.ts
docs/planes-de-estudio/            — PDFs oficiales de planes de UCEMA
scripts/
  validate-carreras.mjs            — valida los JSONs (corre en npm run build)
  generate_carreras.py             — genera todos los JSONs desde PDFs
  parse_plan.py                    — parser de tabla PDF con PyMUPDF
  parse_pdf.py                     — parser alternativo (referencia)
  extract_pdfs.py, debug_pdf.py    — helpers para depurar el parseo
```

## Datos de carreras

- Cada carrera es un JSON en `data/carreras/` con la estructura definida en `types/carrera.ts`
- El campo `nro` (number) es el ID unico de cada materia, viene del plan de estudios oficial
- `correlativas` es un array de `nro` de las materias que hay que tener aprobadas
- `grupo`: "obligatoria" | "topico" | "taller" | "tesis" | "requisito"
- Las electivas (topico) se ocultan por defecto, se muestran con el toggle
- 12 carreras activas en index.json, mas planes legacy/alternativos como referencia
- Los JSONs se generan con `scripts/generate_carreras.py` a partir de los PDFs en `docs/planes-de-estudio/`
- Despues de tocar o regenerar un JSON: `npm run validate`. Chequea campos obligatorios, `nro`
  duplicados, grupos/cuatrimestres validos, correlativas que existan, ciclos de correlativas
  (dejarian materias bloqueadas para siempre) y cupos (`topicos_requeridos` vs topicos cargados).
  Con `--all` valida tambien los planes legacy. Como corre dentro de `npm run build`, un JSON roto
  frena el deploy.
- El parser normaliza el `cuatrimestre` a 1 o 2: algunos PDFs traen periodos con otra numeracion
  (el Trabajo Final de RRII venia como periodo 4) y la app solo modela dos cuatrimestres.

## Routing

- React Router v7 con rutas: `/` redirect, `/carrera/:carreraId`, `*` fallback
- `AppLayout.tsx` maneja la carga dinamica de carrera y sync bidireccional URL ↔ Zustand store
- Cambiar carrera en el Header dropdown navega a la nueva URL y recarga el JSON
- Loop prevention: checks explicitos antes de setState

## Modo "que puedo cursar"

- Boton en la barra del mapa: atenua todo menos las materias con status `disponible`,
  que quedan con halo celeste (`AVAILABLE_GLOW` en theme.ts, role `available` del nodo).
- Tocar cualquier materia sale del modo y pasa a resaltar su cadena de correlativas.
- Se apaga solo al cambiar de carrera.

## PWA (instalable + offline)

- `vite-plugin-pwa` en `vite.config.ts`, `registerType: "autoUpdate"` (no queda una version
  vieja cacheada: se actualiza sola al deployar).
- Los iconos y el og-image se generan con `scripts/generate-icons.mjs`, que dibuja los PNG
  a mano con zlib (sin dependencias de imagen). Si cambia el branding, editar ese script
  y volver a correrlo.
- El boton "Instalar app" del Header solo aparece si el browser disparo `beforeinstallprompt`
  (Chrome/Edge). En iOS se instala a mano con Compartir -> Agregar a inicio.

## Home de bienvenida

- Ruta `/`: sin sesion iniciada muestra `Welcome` (grilla de las 12 carreras con color por
  carrera + login inline). Con sesion, redirige a la ultima carrera del usuario.
- El chequeo de sesion lee directo `localStorage["ucema-map-usuario"]`, la misma clave que
  escribe `useUserStore`.

## Search Palette

- Ctrl+K / Cmd+K abre un command palette para buscar materias
- Busqueda fuzzy con normalizacion de diacriticos
- Muestra status (Aprobada/Cursando/Disponible/Bloqueada) con color
- Enter selecciona y centra el grafo en la materia (via `requestCenterOn`)
- Navegacion con flechas + Escape para cerrar

## Mobile responsive

- Breakpoint 768px via `useIsMobile()` hook con matchMedia
- **Gestos**: mientras hay pinch (2 dedos) no se selecciona ninguna materia, y solo la
  materia seleccionada es arrastrable. Asi el pinch/zoom llega al lienzo en vez de que lo
  capture un nodo.
- Header: hamburger menu, elementos condensados
- MateriaDetail: bottom sheet en vez de sidebar derecha, swipe-to-close
- ProgressBar: layout compacto horizontal
- Legend: colapsable con toggle

## Patrones importantes

- **Zustand sin re-render loops**: los selectores devuelven arrays/objetos estables. `selectAprobadasArray` usa `EMPTY_ARRAY` constante para evitar crear nuevas referencias. Los componentes crean Sets con `useMemo`.
- **Drag solo vertical**: `onNodesChange` intercepta cambios de posicion y fija la X original
- **Nodo spacer**: nodo invisible tipo "spacer" al final del layout para empujar el centro del fitView hacia arriba
- **Viewport forzado**: `doFitView` usa `setViewport` directo con TARGET_ZOOM porque el maxZoom de fitView no siempre se respeta con nodos custom
- **Dark mode**: colores duplicados en theme.ts (light/dark), componentes leen `useThemeStore` y aplican inline styles
- **No hover highlight**: el highlight solo se activa al hacer click (seleccion), no al pasar el mouse
- **Flechas directas**: al seleccionar una materia solo se iluminan las correlativas inmediatas (no toda la cadena recursiva)

## Aplazos

- Un aplazo es una nota de 0 a 3 y vive en `aplazos` (nro de materia -> nota),
  aparte de `notas`: en la historia academica pueden figurar el aplazo y, mas
  tarde, la nota con la que se aprobo.
- Precedencia de estados: aprobada > cursando > aplazada > disponible > bloqueada.
  Si la materia se esta recursando se muestra "cursando" y el nodo conserva el
  badge rojo del aplazo.
- Un aplazo **no habilita correlativas**: solo lo aprobado abre lo que sigue.
  Una materia aplazada se puede volver a cursar, asi que los botones miran si las
  correlativas estan cumplidas y no el status.
- Los aplazos cuentan en el promedio (decision del usuario, coincide con como lo
  informa la universidad). "AP" no cuenta.
- Una materia aprobada no admite aplazo: la UI queda deshabilitada.

## Importar notas del sistema de alumnos

- `utils/importarNotas.ts` parsea el listado de "Notas oficiales" que el alumno
  copia con Ctrl+A / Ctrl+C. Cada fila es `codigo materia nota fecha`, separada
  por tabulaciones o espacios; el resto de la pagina se ignora porque no matchea.
- El codigo del sistema es el mismo `nro` del plan, asi que el cruce es directo;
  si no aparece, se prueba por nombre normalizado.
- Nota >= 4 o "AP" -> aprobada con esa nota. Nota < 4 -> aplazo.
- Importar reemplaza el progreso de esa carrera (es la fuente oficial) y conserva
  lo marcado como "cursando", que no figura en el listado.
- Verificado contra un listado real: 23/23 materias reconocidas y el promedio
  calculado por la app coincide con el que informa la universidad.

## Donde vive el progreso

- **Solo se guarda si hay sesion de Google**, y en `sessionStorage`, como cache
  de la pestania. Sin sesion no se escribe nada: al recargar el mapa arranca
  vacio. Es a proposito — si no hay donde guardarlo, mostrar materias marcadas de
  una visita anterior confunde, y en una compu compartida deja el progreso de
  otro a la vista. Para recuperarlo estan el login y el importador.
- El header muestra "No se guarda" cuando hay materias marcadas sin sesion, y el
  modal de importar tiene "Vaciar mi mapa": antes no habia forma de borrar el
  progreso desde la interfaz.
- **Mapas de versiones viejas**: las versiones anteriores guardaban en
  `localStorage`. Ese progreso NO se adopta solo — `RecuperarProgreso` pregunta
  si conservarlo o empezar de cero. La copia vieja se borra cuando el usuario la
  descarta, o cuando el progreso ya llego sano a Drive (`saveNow`).
- En `localStorage` solo quedan preferencias y la sesion: `ucema-map-theme`,
  `ucema-map-tour-v1`, `ucema-map-perfil` y `ucema-map-token`.

## Cuentas y sync (Google Drive)

El progreso se guarda en un archivo `ucema-map-progreso.json` dentro de
`appDataFolder`: una carpeta oculta del Drive **del propio usuario**, que solo
esta app ve. No hay backend, no hay base de datos compartida y nadie mas puede
leer el progreso de nadie.

- **Configuracion**: `VITE_GOOGLE_CLIENT_ID` (ver `.env.example`). Si no esta
  seteada, `isSyncConfigured()` devuelve false, la UI de login no se muestra y
  la app queda 100% local (localStorage). En Vercel se carga como env var.
- **Scopes**: `drive.appdata` + `userinfo.profile/email`. Son de bajo riesgo:
  Google no exige verificar la app para usarlos.
- **El script de Google se carga bajo demanda** (`loadGis()`), no en el
  index.html: quien nunca se loguea no le pide nada a Google.
- **Segundo login sin friccion**: si ya hay un perfil recordado se pide el token
  con `hint` (la cuenta anterior) y `prompt: ""` (reutiliza el consentimiento).
  Sin eso Google pide elegir cuenta y aceptar permisos cada vez, que es su
  comportamiento por defecto. Si lo rechaza, se reintenta el flujo completo.
- **El login sale siempre de un click**: el flujo de token de Google abre una
  ventana emergente incluso con `prompt: ""`, asi que no hay forma de renovar de
  fondo. Nunca se dispara al cargar la pagina.
- **El token se guarda** en `localStorage` con su vencimiento (`ucema-map-token`,
  ~1h). Al recargar, `restoreSession()` lo reusa y la sesion sigue activa sin
  pedir nada; si vencio o no sirve, se descarta y el header ofrece "Continuar
  como ...". Es una credencial en el navegador, pero solo habilita el
  `appDataFolder` de esta app y el perfil basico.
- **No existe la sesion permanente**: Google no entrega refresh tokens a las apps
  que corren solo en el navegador. El techo es ~1 hora y despues un click.
- **El perfil recordado** (`ucema-map-perfil`: nombre, mail y foto, sin token)
  es lo que permite ofrecer "Continuar como ..." en el header y en la home.
- **Merge al loguearse**: la nube pisa carrera por carrera, y las carreras que
  solo existen en local se conservan (no se pierde lo cargado sin sesion).
- **Guardado automatico con debounce de 1,5s** (`scheduleSave`): cada cambio
  reinicia la cuenta regresiva. `pendingSave` es true mientras hay algo por
  guardar, y `App.tsx` usa ese flag para el warning de `beforeunload`.
- **Logout**: revoca el token, olvida el perfil y **borra el progreso** de la
  sesion. Nada se pierde: quedo en el Drive del usuario y vuelve al reingresar.
- Si el token expira con la pestania abierta, el guardado falla: se suelta la
  sesion y el header muestra "Continuar como ...". El progreso de la sesion no se
  pierde (vive en `sessionStorage`), solo deja de sincronizarse hasta reconectar.

## Validaciones de negocio

- No se puede desmarcar una materia aprobada si alguna dependiente esta aprobada o cursando
- Cursando solo se puede marcar si la materia esta disponible (correlativas aprobadas)
- Al aprobar una materia que estaba cursando, se quita automaticamente de cursando
- Nota "AP" no afecta el promedio, solo las notas numericas (4-10)
