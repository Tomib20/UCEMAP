# UCEMA Map

Mapa interactivo de correlatividades para carreras de la Universidad del CEMA.

Inspirado en [FIUBA-Map](https://fede.dm/FIUBA-Map/).

## Carreras disponibles

- [ ] Ingenieria en Informatica
- [ ] Licenciatura en Economia
- [ ] Licenciatura en Direccion de Empresas
- [ ] (mas por agregar)

## Estructura del proyecto

```
docs/
  planes-de-estudio/    # PDFs oficiales de los planes de estudio de UCEMA
data/
  carreras/             # JSONs con materias, correlatividades y metadata por carrera
src/
  components/           # Componentes de UI (nodos, grafo, filtros, etc.)
  pages/                # Paginas de la app
  styles/               # Estilos globales y variables
  utils/                # Helpers (parseo de datos, layout del grafo, etc.)
  assets/               # Imagenes, iconos, fuentes
public/                 # Archivos estaticos
scripts/                # Scripts auxiliares (ej: parsear PDF a JSON)
```

## Desarrollo

```bash
npm install
npm run dev
```

## Como agregar una carrera

1. Subir el PDF del plan de estudio a `docs/planes-de-estudio/`
2. Generar el JSON de correlatividades en `data/carreras/` (manual o con script)
3. Registrar la carrera en `data/carreras/index.json`
