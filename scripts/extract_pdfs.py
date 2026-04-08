"""Extract text from all PDF plans into .txt files for parsing."""
import os
import sys
import pymupdf

PDF_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "planes-de-estudio")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "planes-de-estudio", "txt")

os.makedirs(OUT_DIR, exist_ok=True)

for filename in sorted(os.listdir(PDF_DIR)):
    if not filename.lower().endswith(".pdf"):
        continue
    pdf_path = os.path.join(PDF_DIR, filename)
    out_path = os.path.join(OUT_DIR, filename.replace(".pdf", ".txt"))
    try:
        doc = pymupdf.open(pdf_path)
        text_parts = []
        for i, page in enumerate(doc):
            text_parts.append(f"=== PAGE {i+1} ===\n")
            text_parts.append(page.get_text())
            text_parts.append("\n")
        doc.close()
        with open(out_path, "w", encoding="utf-8") as f:
            f.write("".join(text_parts))
        print(f"OK  {filename} -> {os.path.basename(out_path)}")
    except Exception as e:
        print(f"ERR {filename}: {e}", file=sys.stderr)
