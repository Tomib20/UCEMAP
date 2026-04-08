# UCEMA Map

Mapa interactivo de correlatividades para carreras de la Universidad del CEMA, inspirado en [FIUBA-Map](https://fede.dm/FIUBA-Map/).

## Comandos

- `npm run dev` — levanta el dev server (Vite)
- `npx vite build` — build de produccion (verificar errores rapido, no usa tsc)
- `npm run build` — build completo con type-check (tsc + vite)

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
  pages/MapPage.tsx      — composicion: GraphView + ProgressBar + MateriaDetail
  App.tsx                — carga JSON de carrera, auto-login, beforeunload warning
data/
  carreras/
    index.json                     — indice de carreras disponibles
    ingenieria-informatica.json    — 54 materias con nro, correlativas, grupo
  schema.json                      — schema JSON (desactualizado, usar types/carrera.ts)
docs/planes-de-estudio/            — PDFs oficiales de planes de UCEMA
```

## Datos de carreras

- Cada carrera es un JSON en `data/carreras/` con la estructura definida en `types/carrera.ts`
- El campo `nro` (number) es el ID unico de cada materia, viene del plan de estudios oficial
- `correlativas` es un array de `nro` de las materias que hay que tener aprobadas
- `grupo`: "obligatoria" | "topico" | "tesis" | "requisito"
- Las electivas (topico) se ocultan por defecto, se muestran con el toggle

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
