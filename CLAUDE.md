# UCEMA Map

Mapa interactivo de correlatividades para carreras de la Universidad del CEMA, inspirado en [FIUBA-Map](https://fede.dm/FIUBA-Map/).

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
- **Google Sheets + Google Forms** — backend serverless estilo FIUBA-Map (lectura via Sheets API con key restringida por dominio, escritura via POST `mode: "no-cors"` a Forms publicos)

## Arquitectura

```
src/
  config/theme.ts        — colores (light/dark), branding, constantes de layout
  types/carrera.ts       — tipos: Materia, Carrera, MateriaStatus, MateriaGrupo
  api/
    sheetsConfig.ts      — IDs/URLs hardcodeados del spreadsheet, forms y API key
    sheetsBackend.ts     — fetchUsuario (GET Sheets API), postUsuario/postRegistro (POST Forms)
  store/
    useProgressStore.ts  — aprobadas, cursando, notas por carrera (persiste en localStorage)
    useThemeStore.ts     — light/dark mode (persiste en localStorage)
    useUserStore.ts      — usuario logueado, isDirty, login/logout/saveToCloud
    syncWatcher.ts       — observa progressStore y marca dirty cuando hay cambios
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

## Sistema de cuentas y sync (cloud)

Inspirado en FIUBA-Map. Backend serverless: Google Sheets como "DB" + Google Forms como write API.

- **No hay password**: solo usuario UCEMA tipo `tbruner27`. Cualquiera que conozca el usuario puede leer/sobreescribir su data. Es por diseño (igual que FIUBA-Map con el padron).
- **Spreadsheet con 2 sheets**:
  - `usuarios`: `timestamp | usuario | carrera_actual` — registra qué carrera tenia seleccionada cada usuario
  - `registros`: `timestamp | usuario | carrera | mapa` — el `mapa` es JSON stringificado con `{aprobadas, cursando, notas}`
- **Forms appendea, nunca actualiza**: cada save crea una fila nueva. `fetchUsuario` toma la última fila por `(usuario, carrera)` iterando de arriba abajo y sobreescribiendo la entrada en un Map.
- **Save manual con boton "Guardar"**: cualquier cambio en aprobadas/cursando/notas estando logueado marca `isDirty: true`. El boton del header se pone verde. Click → `saveToCloud()` → reset dirty. NO hay debounce ni auto-sync (el usuario lo pidió explícito).
- **Login = solo lectura**: `login()` SIEMPRE reemplaza el local con lo que esté en la nube (incluso si está vacío). Nunca pushea local. El campo `isKnown` de `fetchUsuario` distingue usuarios brand-new (que reciben un `postUsuario` para registrarlos en `usuarios`) de los que ya existen.
- **Logout = limpiar local + warning si dirty**: NO flushea automáticamente. Si `isDirty === true`, muestra `window.confirm("¿Salir igual?")` antes de limpiar. Esto fuerza al usuario a guardar explícitamente o aceptar la pérdida.
- **`pushAllCarrerasToCloud` postea estado vacío**: importante para que "desmarcar todo y guardar" se persista en la nube. Postea cualquier carrera con key en local, sin filtrar por contenido.
- **`beforeunload` warning**: en `App.tsx`, si `isDirty === true`, el browser muestra el dialog nativo de "abandonar sitio".
- **Auto-cambio de carrera**: cambiar carrera sí postea automáticamente a `usuarios` (sin debounce, sin marcar dirty), porque eso es preferencia de UI, no data del usuario. Lo maneja el `syncWatcher`.
- **API key restringida por dominio**: la key vive hardcodeada en `sheetsConfig.ts` pero está restringida en Google Cloud Console por HTTP referrer (localhost + dominio de prod). Por eso es seguro committearla.

## Validaciones de negocio

- No se puede desmarcar una materia aprobada si alguna dependiente esta aprobada o cursando
- Cursando solo se puede marcar si la materia esta disponible (correlativas aprobadas)
- Al aprobar una materia que estaba cursando, se quita automaticamente de cursando
- Nota "AP" no afecta el promedio, solo las notas numericas (4-10)
