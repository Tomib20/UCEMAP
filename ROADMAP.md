# Roadmap

Lo que falta y lo que ya esta hecho. Las ideas estan ordenadas por lo que mas
sumaria a quien usa la app, no por dificultad.

## UX / Funcionalidad

1. **Export/Import de progreso en JSON** — hoy solo se exporta PNG. Un boton para bajar/subir el
   progreso serviria de backup y para compartir sin depender de la cuenta. Opcionalmente, codificar
   el estado en la URL.
2. **Simulador "que pasa si?"** — estado "planeada" para simular que se desbloquea en cuatrimestres
   futuros, tipo planificador. `getAncestors`/`getDescendants` ya estan y se usan para el toggle de
   cadena completa.
3. **Progreso por creditos** — la barra cuenta materias, pero `Materia` tiene `creditos` y UCEMA
   cuenta oficialmente por creditos. Conviene contar por creditos cuando el dato esta y caer a
   materias si no, y pintar aparte el tramo de lo que estas cursando.
4. **Keyboard navigation en el grafo** — Escape ya cierra, y la search palette navega con flechas.
   Falta moverse entre materias y marcar con el teclado.
5. **Animacion al aprobar/cursar** — hoy hay transiciones de color; falta un micro-feedback (pulse)
   al marcar.
6. **Cursada vs final** — hoy "cursar con correlativa en curso" se resuelve con un confirm de
   "tenes permiso?". Si el reglamento de UCEMA distingue cursada aprobada de final aprobado,
   convendria modelar las correlativas en dos grupos separados.
7. **Chips de nivel en mobile** — botones (1 · 2 · 3 …) que centren el mapa en cada anio: en un
   plan de 5 columnas ayuda bastante en pantalla chica.

## Visual / UI

8. **Tooltip on hover** — ya existe (`MateriaHoverInfo`), pero solo en desktop. Evaluar equivalente
   en mobile mas alla del two-tap.

## Tecnico / Calidad de codigo

9. **Inline styles vs CSS variables** — sigue habiendo mucho `mode === "dark" ? ... : ...`. Las
   variables ya estan definidas en `index.css` (`--surface-*`, `--edge-*`) y las usa `html/body`;
   falta migrar los componentes para leerlas en vez de ramificar por `mode`. El helper `cssVar` se
   borro por no tener uso: si se encara la migracion, conviene volver a crearlo.
10. **Casts `as unknown as`** — quedan dos: el evento del context menu en `GraphView.tsx` y el
   `import.meta.glob` de carreras en `AppLayout.tsx`.
11. **Bundle de 530 kB** — el build avisa. React Flow pesa; evaluar code-splitting si molesta.

## Datos

12. **Mas carreras / planes nuevos** — cuando UCEMA publique planes nuevos, regenerar con
    `generate_carreras.py` y validar.
13. **Chequeos extra en el validador** — `scripts/validate-carreras.mjs` ya cubre campos, `nro`
    duplicados, correlativas inexistentes, ciclos y cupos. Se le podria agregar deteccion de
    correlativas "hacia atras" (una materia de 1er anio que dependa de una de 4to) como aviso.

---

## Hecho

- Selector de carrera con rutas `/carrera/:id` (React Router).
- Search palette con Ctrl/Cmd+K y busqueda fuzzy.
- Toggle de cadena completa de correlativas.
- Responsive / mobile: bottom sheet, two-tap, header condensado.
- Labels de anio con stats por anio y separador de cuatrimestre.
- Export PNG del mapa.
- Cuentas y sync manual via Google Sheets + Forms.
- Limpieza: se saco `YearLabels.tsx` (no se usaba), `getColumnLabels`, `cssVar`, `removeNota` y los
  `validate.js` / `detailed_validation.js` sueltos en la raiz.
- `doHighlight` ahora usa `highlightNodes` / `highlightEdges` en vez de llamar dos veces a la misma
  funcion descartando la mitad del resultado.
- Validacion de datos en build time (`npm run validate`), enganchada a `npm run build`.
- Modo "que puedo cursar" (halo celeste en las disponibles), fix de gestos
  mobile (pinch de 2 dedos y drag solo de la seleccionada), contador de electivas en el boton,
  meta tags + og-image, PWA instalable con iconos propios, mini-tour "Como usar el mapa" y home
  de bienvenida con las 12 carreras.
