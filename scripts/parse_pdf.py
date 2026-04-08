"""
Parse a UCEMA Plan de Estudio PDF into structured data.

Usage:
    python parse_pdf.py "Plan de Estudios - LIAN.pdf"

Output:
    JSON to stdout with structure:
    {
        "metadata": { "programa": ..., "plan": ..., "titulo": ..., "resolucion": ... },
        "groups": [
            {
                "group": "Obligatoria" | "Topico" | "Taller" | ...,
                "rows": [
                    { "anio": 1, "periodo": 1, "tipo": "Semestre", "nro": 1234, "nombre": "...", "credito": 1.0 }
                ]
            }
        ],
        "correlativas": [
            { "materia_nro": 1234, "correlativa_nro": 5678 }
        ]
    }
"""
import json
import sys
import os
import re
import pymupdf


def extract_rows_from_page(page):
    """Extract text grouped by rows (similar Y coordinate)."""
    words = page.get_text("words")  # list of (x0, y0, x1, y1, text, block, line, word)
    if not words:
        return []
    # Group by line number provided by PyMuPDF
    lines = {}
    for w in words:
        x0, y0, x1, y1, text, block, line, _ = w
        key = (block, line)
        if key not in lines:
            lines[key] = []
        lines[key].append((x0, text))
    # Sort each line by x, then sort lines by y
    line_list = []
    for key in lines:
        sorted_words = sorted(lines[key], key=lambda t: t[0])
        text = " ".join(w[1] for w in sorted_words).strip()
        # Get the Y of the first word
        y = next(w[1] for w in words if (w[5], w[6]) == key)
        x_first = sorted_words[0][0] if sorted_words else 0
        line_list.append((y, x_first, text, sorted_words))
    line_list.sort(key=lambda t: (t[0], t[1]))
    return line_list


def parse_pdf(pdf_path):
    doc = pymupdf.open(pdf_path)
    all_pages_lines = []
    for page in doc:
        lines = extract_rows_from_page(page)
        all_pages_lines.append(lines)
    doc.close()
    return all_pages_lines


def classify_lines_by_y(words_with_pos, y_tol=2.0):
    """Group words on same Y row (using tolerance)."""
    if not words_with_pos:
        return []
    sorted_words = sorted(words_with_pos, key=lambda w: (w[1], w[0]))
    rows = []
    current_y = None
    current_row = []
    for x, y, text in sorted_words:
        if current_y is None or abs(y - current_y) <= y_tol:
            current_row.append((x, text))
            current_y = y if current_y is None else current_y
        else:
            current_row.sort(key=lambda t: t[0])
            rows.append(current_row)
            current_row = [(x, text)]
            current_y = y
    if current_row:
        current_row.sort(key=lambda t: t[0])
        rows.append(current_row)
    return rows


def parse_pdf_v2(pdf_path):
    """Parse using raw word positions and Y-grouping."""
    doc = pymupdf.open(pdf_path)
    pages_data = []
    for page_num, page in enumerate(doc):
        words = page.get_text("words")
        # Convert to (x, y, text)
        triples = [(w[0], w[1], w[4]) for w in words]
        rows = classify_lines_by_y(triples)
        pages_data.append({
            "page": page_num + 1,
            "rows": [
                {
                    "y": triples[0][1] if False else None,  # placeholder
                    "cells": [(round(x, 1), text) for x, text in row]
                }
                for row in rows
            ]
        })
    doc.close()
    return pages_data


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python parse_pdf.py <pdf_path>", file=sys.stderr)
        sys.exit(1)
    pdf_path = sys.argv[1]
    if not os.path.isabs(pdf_path):
        # Try docs/planes-de-estudio relative to script
        candidate = os.path.join(os.path.dirname(__file__), "..", "docs", "planes-de-estudio", pdf_path)
        if os.path.exists(candidate):
            pdf_path = candidate
    data = parse_pdf_v2(pdf_path)
    print(json.dumps(data, ensure_ascii=False, indent=2))
