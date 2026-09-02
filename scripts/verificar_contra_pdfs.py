"""
Compara los JSON de data/carreras/ contra los PDFs oficiales de los planes.

`validate-carreras.mjs` chequea que los datos sean coherentes consigo mismos
(que no falten campos, que las correlativas apunten a materias que existen, que
no haya ciclos). Este script responde la otra pregunta, la que importa de cara
al usuario: **lo que muestra el mapa, .es lo que dice el plan oficial?**

Reporta tres cosas por carrera:
  - materias del PDF que no estan en el JSON (datos perdidos),
  - correlativas del PDF que no estan en el JSON (requisitos que no se muestran),
  - correlativas del JSON que el PDF no respalda (requisitos inventados).

El parser deja algo de ruido: filas de la tabla que no son materias y quedan
como pares con `nro` inexistente. Esos se ignoran, porque generate_carreras.py
tambien los descarta.

Requiere pymupdf:  pip install pymupdf
Uso:               python scripts/verificar_contra_pdfs.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse_plan import parse_plan

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
CARRERAS = os.path.join(RAIZ, "data", "carreras")
PLANES = os.path.join(RAIZ, "docs", "planes-de-estudio")


def cargar_pdf(nombre):
    parsed = parse_plan(os.path.join(PLANES, nombre))
    materias = {r["nro"] for grupo in parsed.get("groups", {}).values() for r in grupo}
    pares = {tuple(p) for p in parsed.get("correlativas", [])}
    # Solo los pares entre materias que existen de verdad en el plan.
    pares = {(a, b) for a, b in pares if a in materias and b in materias}
    return materias, pares


def main():
    index = json.load(open(os.path.join(CARRERAS, "index.json"), encoding="utf-8"))
    problemas = 0

    for entrada in index["carreras"]:
        pdf = entrada.get("planEstudio")
        if not pdf or not os.path.exists(os.path.join(PLANES, pdf)):
            print(f"OMITIDA  {entrada['id']}: no se encontro el PDF del plan")
            continue

        materias_pdf, pares_pdf = cargar_pdf(pdf)
        carrera = json.load(open(os.path.join(CARRERAS, entrada["archivo"]), encoding="utf-8"))
        nombres = {m["nro"]: m["nombre"] for m in carrera["materias"]}
        materias_json = set(nombres)
        pares_json = {
            (m["nro"], corr)
            for m in carrera["materias"]
            for corr in (m.get("correlativas") or [])
        }

        faltan_materias = materias_pdf - materias_json
        faltan_pares = pares_pdf - pares_json
        sobran_pares = pares_json - pares_pdf

        if not (faltan_materias or faltan_pares or sobran_pares):
            print(f"OK       {entrada['id']}  ({len(materias_json)} materias, {len(pares_json)} correlativas)")
            continue

        problemas += 1
        print(f"REVISAR  {entrada['id']}")
        for nro in sorted(faltan_materias):
            print(f"           materia del plan que falta en el JSON: {nro}")
        for materia, corr in sorted(faltan_pares):
            print(f"           correlativa del plan que no se muestra: {materia} ({nombres.get(materia, '?')}) <- {corr} ({nombres.get(corr, '?')})")
        for materia, corr in sorted(sobran_pares):
            print(f"           correlativa que el plan no respalda: {materia} ({nombres.get(materia, '?')}) <- {corr} ({nombres.get(corr, '?')})")

    print()
    if problemas:
        print(f"{problemas} carrera(s) con diferencias contra el plan oficial.")
    else:
        print(f"Las {len(index['carreras'])} carreras coinciden con sus planes oficiales.")
    return 1 if problemas else 0


if __name__ == "__main__":
    sys.exit(main())
