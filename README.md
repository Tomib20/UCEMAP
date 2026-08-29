# UCEMA Map

Mapa interactivo de correlatividades para las carreras de la Universidad del CEMA.
Marcas las materias que aprobaste o estas cursando y el grafo te muestra que se te habilita.
Se instala como app en el celular y funciona sin conexion.

## Carreras disponibles

12 carreras activas (`data/carreras/index.json`):

| | |
|---|---|
| Ingenieria en Informatica | Licenciatura en Economia |
| Abogacia | Licenciatura en Finanzas |
| Actuario | Licenciatura en Marketing |
| Business Administration | Licenciatura en Negocios Digitales |
| Contador Publico | Licenciatura en Relaciones Internacionales |
| Licenciatura en Ciencias Politicas | Licenciatura en Direccion de Empresas |

Ademas hay planes legacy (`*-old.json`, `*-m.json`, `*-2025.json`) que quedan como referencia y no
aparecen en el selector.

## Que hace

- Grafo de correlatividades por anio, con electivas y talleres aparte.
- Modo **"que puedo cursar"**: ilumina solo las materias que ya podes anotarte.
- Progreso por bloque, promedio, notas por materia (incluida "AP").
- Buscador con Ctrl/Cmd+K, modo oscuro y export del mapa a PNG.
- Sesion con Google opcional: tu progreso se guarda en tu propio Google Drive.
- PWA: instalable desde el navegador y usable offline.

## Stack

React 19 + TypeScript + Vite - [@xyflow/react](https://reactflow.dev) para el grafo - Zustand para
el estado (persistido en localStorage) - Tailwind CSS v4 - React Router v7. El sync opcional guarda
el progreso en el Google Drive del propio usuario (carpeta `appDataFolder`), sin backend propio.

## Estructura del proyecto

```
data/carreras/          # JSONs de materias y correlatividades + index.json + schema.json
docs/planes-de-estudio/ # PDFs oficiales de los planes de UCEMA
public/                 # favicon, iconos de la PWA y og-image (generados por script)
scripts/                # validador de datos, generador de iconos y parsers de PDF
src/
  lib/googleDrive.ts    # login con Google y sync del progreso en Drive
  components/           # graph/ (React Flow), layout/, ui/
  config/theme.ts       # colores light/dark, branding, medidas del layout
  store/                # Zustand: progreso, usuario, tema, sync watcher
  utils/                # layout del grafo, status de materias, cadena de correlativas
  types/carrera.ts      # contrato de los JSON de carreras
```

## Desarrollo

```bash
npm install
npm run dev
```

Para probar el login con Google hay que copiar `.env.example` a `.env` y completar
`VITE_GOOGLE_CLIENT_ID`. Sin esa variable la app funciona igual, pero solo local.

- `npm run dev` - dev server
- `npm run validate` - valida los JSON de carreras
- `npm run build` - valida, type-checkea y buildea a `dist/`
- `node scripts/generate-icons.mjs` - regenera los iconos de la PWA y el og-image

## Como agregar una carrera

1. Subir el PDF del plan a `docs/planes-de-estudio/`.
2. Generar el JSON: `python scripts/generate_carreras.py` (ver [scripts/README.md](scripts/README.md)).
3. Registrar la carrera en `data/carreras/index.json`.
4. Correr `npm run validate`.
