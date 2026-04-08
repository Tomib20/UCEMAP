# Ideas de mejoras - UCEMA Map

## UX / Funcionalidad

1. **Selector de carrera** — Usar `react-router-dom` (ya instalado) para rutas `/carrera/:id`. El `index.json` ya soporta multiples carreras pero `App.tsx` hardcodea ingenieria-informatica.
2. **Busqueda de materias** — Buscador rapido (Ctrl+K o campo en header) que filtre y centre el grafo en la materia encontrada.
3. **Highlight de cadena completa** — Toggle o tecla (Shift) para ver toda la cadena recursiva. `getAncestors`/`getDescendants` ya estan implementados en `prerequisiteChain.ts` pero no se usan.
4. **Export/Import de progreso** — Boton para exportar/importar JSON del progreso (vive solo en localStorage). Opcionalmente, codificar estado en URL para compartir.
5. **Simulador "que pasa si?"** — Estado "planeada" para simular que se desbloquea en cuatrimestres futuros, tipo planificador.
6. **Responsive / Mobile** — Sidebar de 320px asume pantalla ancha. Bottom sheet para mobile.
7. **Keyboard navigation** — Escape para cerrar sidebar, flechas para navegar, Enter para aprobar.

## Visual / UI

8. **Labels de anio en el grafo** — `YearLabels.tsx` existe pero no se renderiza. Agregarlo a `GraphView`.
9. **Separador visual de cuatrimestres** — Linea punteada o label "C1"/"C2" entre cuatrimestres dentro de cada columna.
10. **Animacion al aprobar/cursar** — Micro-feedback visual (pulse, transicion) al marcar una materia.
11. **Tooltip on hover** — Tooltip rapido mostrando nombre + status + correlativas sin abrir sidebar.
12. **Progress bar: creditos** — La barra cuenta materias pero `Materia` tiene `creditos`. Mostrar progreso por creditos (como cuenta UCEMA oficialmente).

## Tecnico / Calidad de codigo

13. **`react-router-dom` sin usar** — Instalado pero no importado. Usarlo para rutas o sacarlo.
14. **`@dagrejs/dagre` sin usar** — Instalado pero no importado. Evaluar si se usa para auto-layout o sacarlo.
15. **Casts `as unknown as`** — En `MateriaNode.tsx` y `GraphView.tsx`. Tipar nodos genericamente con `Node<MateriaNodeData>`.
16. **`doHighlight` llama `applyChainHighlight` dos veces** — Refactorear para actualizar nodos y edges en una sola pasada.
17. **Inline styles vs CSS variables** — Mucho `mode === "dark" ? ... : ...`. Usar CSS custom properties seteadas en root segun el modo y Tailwind con esas variables.

## Datos

18. **Mas carreras** — Agregar Lic. en Economia, Lic. en Direccion de Empresas, etc.
19. **Validacion de datos** — Script de validacion en build time para verificar consistencia del JSON (correlativas referenciando `nro` existentes, etc.).
