"""
Parse a UCEMA Plan de Estudio PDF into a structured JSON of materias.

The PDF structure has tables with columns:
    Año | Período | Tipo Periodo | Nro | Materia | Crédito

Plus a "Materias Correlativas" section at the end mapping materia -> correlativa.

Usage:
    python parse_plan.py "Plan de Estudios - LIAN.pdf"
"""
import json
import sys
import os
import re
import pymupdf


def get_rows(page, y_tol=2.5):
    """Group words on the page by Y coordinate to reconstruct rows."""
    words = page.get_text("words")
    if not words:
        return []
    # words: (x0, y0, x1, y1, text, block, line, word)
    quads = sorted([(w[0], w[2], w[1], w[4]) for w in words], key=lambda t: (t[2], t[0]))
    rows = []
    current_y = None
    current = []
    for x0, x1, y, text in quads:
        if current_y is None:
            current_y = y
        if abs(y - current_y) <= y_tol:
            current.append((x0, x1, text))
        else:
            current.sort(key=lambda t: t[0])
            rows.append({"y": current_y, "cells": current})
            current = [(x0, x1, text)]
            current_y = y
    if current:
        current.sort(key=lambda t: t[0])
        rows.append({"y": current_y, "cells": current})
    return rows


def cell_groups(row, gap_threshold=4):
    """Group consecutive cells (same column) by X gap. Uses real x1 from each word."""
    cells = row["cells"]
    if not cells:
        return []
    groups = []
    current_text = [cells[0][2]]
    current_x = cells[0][0]
    last_x1 = cells[0][1]
    for x0, x1, text in cells[1:]:
        if x0 - last_x1 < gap_threshold:
            current_text.append(text)
        else:
            groups.append((current_x, " ".join(current_text)))
            current_text = [text]
            current_x = x0
        last_x1 = x1
    groups.append((current_x, " ".join(current_text)))
    return groups


def is_data_row(groups):
    """Check if a row looks like a materia data row: starts with año (1-6), period (1-2), tipo, nro, name, credit."""
    if len(groups) < 5:
        return False
    first = groups[0][1].strip()
    second = groups[1][1].strip() if len(groups) > 1 else ""
    if not first.isdigit() or int(first) > 7:
        return False
    if not second.isdigit() or int(second) > 4:
        return False
    return True


def parse_plan(pdf_path):
    doc = pymupdf.open(pdf_path)
    metadata = {}
    groups_data = {}  # group_name -> list of materias
    group_required = {}  # group_name -> required count (from "Materias: N" header)
    correlativas_pairs = []  # list of (materia_nro, correlativa_nro)
    current_group = None
    in_correlativas = False
    correl_left = None  # current materia nro for correlativa pairing

    for page_num, page in enumerate(doc):
        rows = get_rows(page)

        for row in rows:
            groups = cell_groups(row)
            text_full = " ".join(g[1] for g in groups).strip()

            # Detect metadata fields - check individual cell groups instead of full text
            if "programa" not in metadata:
                for i, (_, cell_text) in enumerate(groups):
                    if cell_text.strip() == "Programa :" and i + 1 < len(groups):
                        metadata["programa"] = groups[i + 1][1].strip()
                        break
            if "plan" not in metadata:
                for i, (_, cell_text) in enumerate(groups):
                    if cell_text.strip() == "Plan :" and i + 1 < len(groups):
                        metadata["plan"] = groups[i + 1][1].strip()
                        break
            if "titulo" not in metadata:
                for i, (_, cell_text) in enumerate(groups):
                    s = cell_text.strip()
                    if s == "Título:" and i + 1 < len(groups):
                        metadata["titulo"] = groups[i + 1][1].strip()
                        break
                    if s.startswith("Título:") and ":" in s:
                        rest = s.split(":", 1)[1].strip()
                        if rest:
                            metadata["titulo"] = rest
                            break
            if "resolucion" not in metadata:
                for i, (_, cell_text) in enumerate(groups):
                    if "Resolución" in cell_text and "Nro" in cell_text and i + 1 < len(groups):
                        metadata["resolucion"] = groups[i + 1][1].strip()
                        break

            # Detect group restriction
            if "Restriccion" in text_full and "Grupo" in text_full:
                # Cell layout: "Restriccion del Grupo de Materias:" | "<group_name>" | "Materias: N" | "Créditos:" | "N.NN"
                group_name = None
                for i, (_, cell_text) in enumerate(groups):
                    if "Restriccion" in cell_text and "Grupo" in cell_text and i + 1 < len(groups):
                        group_name = groups[i + 1][1].strip()
                        break
                if group_name:
                    current_group = group_name
                    in_correlativas = False
                    if current_group not in groups_data:
                        groups_data[current_group] = []
                # Extract "Materias: N" count for required total
                for _, cell_text in groups:
                    m2 = re.match(r"Materias\s*:\s*(\d+)", cell_text.strip())
                    if m2 and current_group:
                        group_required[current_group] = int(m2.group(1))
                        break
                continue

            # Detect correlativas section
            if "Materias Correlativas" in text_full:
                in_correlativas = True
                current_group = None
                continue
            if "Equivalencias de Materias" in text_full:
                in_correlativas = False
                continue

            # Skip header rows
            if text_full in ("Año Período Tipo Periodo Nro Materia Credito", "Nro Materia Nro Materia Equivalentes", "Nro Materia Nro Materia Correlativa"):
                continue
            if "Año" in text_full and "Período" in text_full and "Materia" in text_full:
                continue
            if text_full.startswith("Nro Materia"):
                continue

            # Parse data row inside a group
            if current_group and not in_correlativas and is_data_row(groups):
                try:
                    anio = int(groups[0][1])
                    periodo = int(groups[1][1])
                    # Cell 3 has the nro, but it might be merged with the name (e.g., "14722 Teoría...")
                    cell3 = groups[3][1].strip()
                    nombre_prefix = ""
                    nro_match = re.match(r"^(\d{1,6})(?:\s+(.*))?$", cell3)
                    if nro_match:
                        nro = int(nro_match.group(1))
                        nombre_prefix = nro_match.group(2) or ""
                    else:
                        nro = int(cell3)  # will fail if not numeric

                    # Credit is the last group, usually a float
                    last_text = groups[-1][1].strip()
                    try:
                        credito = float(last_text)
                        rest_groups = groups[4:-1]
                    except ValueError:
                        credito = 1.0
                        rest_groups = groups[4:]
                    rest_text = " ".join(g[1] for g in rest_groups).strip()
                    nombre = (nombre_prefix + " " + rest_text).strip() if nombre_prefix else rest_text
                    groups_data[current_group].append({
                        "nro": nro,
                        "nombre": nombre,
                        "anio": anio,
                        "cuatrimestre": periodo,
                        "creditos": credito,
                    })
                except (ValueError, IndexError):
                    pass

            # Parse correlativas: each row may have one or two materia nros + names
            if in_correlativas:
                # Format: <nro_materia> <nombre_materia> <nro_correlativa> <nombre_correlativa>
                # But often the materia is repeated only on first row, then continuation rows have only correlativa
                # Look for nros at start
                nro_pattern = re.findall(r"\b(\d{1,5})\b", text_full)
                if len(nro_pattern) >= 2:
                    # Two nros in a row -> materia and correlativa
                    materia_nro = int(nro_pattern[0])
                    correl_nro = int(nro_pattern[1])
                    correlativas_pairs.append((materia_nro, correl_nro))
                    correl_left = materia_nro
                elif len(nro_pattern) == 1 and correl_left is not None:
                    # Single nro -> continuation of previous materia
                    correl_nro = int(nro_pattern[0])
                    correlativas_pairs.append((correl_left, correl_nro))

    doc.close()

    return {
        "metadata": metadata,
        "groups": groups_data,
        "group_required": group_required,
        "correlativas": correlativas_pairs,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python parse_plan.py <pdf_path>", file=sys.stderr)
        sys.exit(1)
    pdf_path = sys.argv[1]
    if not os.path.isabs(pdf_path):
        candidate = os.path.join(os.path.dirname(__file__), "..", "docs", "planes-de-estudio", pdf_path)
        if os.path.exists(candidate):
            pdf_path = candidate
    data = parse_plan(pdf_path)
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(data, ensure_ascii=False, indent=2))
