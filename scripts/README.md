# Scripts

## Validacion de datos (Node)

`validate-carreras.mjs` chequea que los JSON de `data/carreras/` cumplan lo que espera la app
(`src/types/carrera.ts`): campos obligatorios, `nro` unicos, grupos y cuatrimestres validos,
correlativas que existan de verdad, ausencia de ciclos, y que `topicos_requeridos` /
`talleres_requeridos` no pidan mas materias de las cargadas. Ademas verifica que el `index.json`
apunte a archivos y PDFs que existen.

```bash
npm run validate          # solo las 12 carreras del index.json
node scripts/validate-carreras.mjs --all   # incluye los planes legacy
```

Sale con codigo 1 si hay errores; corre automaticamente antes de `npm run build`.

## Parseo de PDFs (Python)

Requiere `pymupdf` (`pip install pymupdf`).

| Script | Que hace |
|---|---|
| `generate_carreras.py` | Genera **todos** los JSON de `data/carreras/` a partir de los PDFs de `docs/planes-de-estudio/`. Es el que se usa en la practica. |
| `parse_plan.py` | Parser de la tabla del PDF (Año / Período / Tipo / Nro / Materia / Crédito) + la seccion de correlativas. Lo usa `generate_carreras.py`. |
| `parse_pdf.py` | Parser alternativo, se mantiene como referencia. |
| `extract_pdfs.py` | Vuelca el texto plano de cada PDF a `docs/planes-de-estudio/txt/` para inspeccionarlo a mano. |
| `debug_pdf.py` | Muestra las filas que ve el parser en una pagina puntual. Util cuando un plan sale mal parseado. |

```bash
python scripts/generate_carreras.py
npm run validate          # siempre validar despues de regenerar
```

Los avisos de `generate_carreras.py` van por stderr (por ejemplo, cuando un plan trae un periodo
que no es 1 ni 2 y hay que normalizarlo a cuatrimestre).
