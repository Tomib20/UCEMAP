"""Debug what rows the parser is seeing."""
import sys
import os
import pymupdf

sys.path.insert(0, os.path.dirname(__file__))
from parse_plan import get_rows, cell_groups, is_data_row

pdf_path = sys.argv[1]
if not os.path.isabs(pdf_path):
    pdf_path = os.path.join(os.path.dirname(__file__), "..", "docs", "planes-de-estudio", pdf_path)

doc = pymupdf.open(pdf_path)
page_num = int(sys.argv[2]) if len(sys.argv) > 2 else 1
page = doc[page_num - 1]
rows = get_rows(page)
sys.stdout.reconfigure(encoding="utf-8")
print(f"=== Page {page_num}, {len(rows)} rows ===")
for i, row in enumerate(rows):
    groups = cell_groups(row)
    is_data = is_data_row(groups)
    marker = "DATA" if is_data else "    "
    text = " | ".join(f"{round(x,1)}:{t}" for x, t in groups)
    print(f"{i:3d} y={row['y']:.1f} {marker} {text[:200]}")
doc.close()
