"""
Generate carrera JSONs from all PDFs in docs/planes-de-estudio/.

Maps the parsed PDF data into the format expected by the React app:
{
    "id": "...",
    "nombre": "...",
    "programa": "...",
    "plan": "...",
    "resolucion": "...",
    "titulo": "...",
    "anios": N,
    "materias": [...],
    "topicos_requeridos": N,
    "talleres_requeridos": N
}
"""
import json
import os
import re
import sys
import unicodedata
from parse_plan import parse_plan

PDF_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "planes-de-estudio")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "carreras")

# Map filename (without "Plan de Estudios - " prefix and ".pdf" suffix) -> (id, nombre)
# Filenames ending in "n" indicate the new plan version.
FILENAME_INFO = {
    "ININF": ("ingenieria-informatica-old", "Ingenieria en Informatica (Plan viejo)"),
    "ININFn": ("ingenieria-informatica", "Ingenieria en Informatica"),
    "LIE25": ("licenciatura-economia-2025", "Licenciatura en Economia (Plan 2025)"),
    "LIEM": ("licenciatura-economia-m", "Licenciatura en Economia (Plan M)"),
    "LIEn": ("licenciatura-economia", "Licenciatura en Economia"),
    "LIA": ("licenciatura-administracion-old", "Licenciatura en Direccion de Empresas (Plan viejo)"),
    "LIAN": ("licenciatura-administracion", "Licenciatura en Direccion de Empresas"),
    "LICPn": ("licenciatura-ciencias-politicas", "Licenciatura en Ciencias Politicas"),
    "LIRIn": ("licenciatura-relaciones-internacionales", "Licenciatura en Relaciones Internacionales"),
    "LIMAn": ("licenciatura-marketing", "Licenciatura en Marketing"),
    "LIND": ("licenciatura-negocios-digitales", "Licenciatura en Negocios Digitales"),
    "LIFI": ("licenciatura-finanzas", "Licenciatura en Finanzas"),
    "ABOG": ("abogacia-old", "Abogacia (Plan viejo)"),
    "ABOGn": ("abogacia", "Abogacia"),
    "CCPn": ("contador-publico", "Contador Publico"),
    "ACTU": ("actuario", "Actuario"),
    "BA": ("business-administration", "Business Administration"),
}

# Map group label from PDF -> our group key
GROUP_MAP = {
    "Obligatoria": "obligatoria",
    "Tópico": "topico",
    "Topico": "topico",
    "Tesis": "tesis",
    "Taller": "taller",
    "Requisito": "requisito",
    "Otros Requisitos": "requisito",
    "Seminario": "taller",  # Seminarios in ABOG plan are like talleres
}


def normalize(text):
    """Remove accents and normalize for comparison."""
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


# All known UCEMA program codes that may appear in materia names
PROGRAM_CODES = [
    "LICC", "LIDE", "LIDEN", "LIE", "LIF", "LIFI", "LIMA", "LIRI", "LICP",
    "LIA", "LIAN", "CCP", "ININF", "INIA", "LIND", "ACTU", "BA", "ABOG",
    "LIEM", "LIEN",
]


def clean_name(name, aggressive=False):
    """Clean materia name: remove trailing program codes like 'LICC', 'LIDE - CCP', etc.
    If aggressive=True, also remove codes attached with hyphens or no space (e.g. 'Física I-ININF').
    """
    if not name:
        return ""
    codes = "|".join(PROGRAM_CODES)

    # Remove trailing " - CODE - CODE - CODE..." patterns (with optional " N" suffix)
    name = re.sub(
        rf"\s*-\s*({codes})(\s*N)?(\s*-\s*({codes})(\s*N)?)*\s*-?\s*$",
        "",
        name,
    )
    # Remove trailing " CODE" (no dash, just space)
    name = re.sub(rf"\s+({codes})(\s*N)?\s*$", "", name)

    if aggressive:
        # Remove "-CODE" attached without space (e.g. "Física I-ININF")
        name = re.sub(rf"-({codes})(\s*N)?\s*$", "", name)
        # Remove " -CODE-" or "-CODE-" mid/end patterns
        name = re.sub(rf"\s*-({codes})-\s*", " ", name)
        # Remove leading/trailing residual "-"
        name = name.strip(" -")
        # Re-run trailing cleanup in case of nested patterns
        name = re.sub(
            rf"\s*-\s*({codes})(\s*N)?(\s*-\s*({codes})(\s*N)?)*\s*-?\s*$",
            "",
            name,
        )
        name = re.sub(rf"\s+({codes})(\s*N)?\s*$", "", name)

    name = name.strip(" -")
    name = re.sub(r"\s+", " ", name)
    return name


def normalize_cuatrimestre(periodo, nro, nombre):
    """
    La app solo modela cuatrimestre 1 o 2 (types/carrera.ts). Algunos planes
    traen el periodo con otra numeracion (ej: LIRI trae el Trabajo Final como
    periodo 4), asi que lo mapeamos a 1/2 por paridad y avisamos por stderr.
    """
    if periodo in (1, 2):
        return periodo
    normalizado = 2 if periodo % 2 == 0 else 1
    print(
        f"  aviso: {nro} ({nombre}) tiene periodo {periodo}; se normaliza a cuatrimestre {normalizado}",
        file=sys.stderr,
    )
    return normalizado


def determine_anios(materias):
    """Get the max year value from obligatorias."""
    obls = [m for m in materias if m.get("grupo") == "obligatoria"]
    if not obls:
        return 4
    return max(m["anio"] for m in obls)


def parse_resolution(text):
    """Extract resolution number from a string like 'Licenciado Resolución Rect. Nro.: 32/18 y 24/19'."""
    if not text:
        return ""
    m = re.search(r"Nro\.?:\s*(.+?)(?:$|\s+\d+\s*$)", text)
    if m:
        return m.group(1).strip()
    # Try simpler pattern
    m = re.search(r":\s*(\S+(?:\s+y\s+\S+)*)\s*$", text)
    if m:
        return m.group(1).strip()
    return text.strip()


def build_carrera(pdf_path, parsed):
    """Build the carrera JSON object from parsed data."""
    metadata = parsed["metadata"]
    raw_groups = parsed["groups"]
    group_required = parsed.get("group_required", {})
    correlativas = parsed["correlativas"]

    programa = metadata.get("programa", "").strip()
    # Some PDFs have "ININF" then "N" on next row, etc. Try to detect both forms.
    plan = metadata.get("plan", "").strip()
    titulo = metadata.get("titulo", "").strip()
    if not titulo:
        # Sometimes the title got merged with "Resolución..."
        res_text = metadata.get("resolucion", "")
        # Look for "Licenciado", "Abogado", "Ingeniero", "Contador"
        for t in ["Licenciado", "Abogado", "Ingeniero", "Contador", "Actuario", "Bachelor"]:
            if t in res_text:
                titulo = t
                break
    resolucion = parse_resolution(metadata.get("resolucion", ""))

    # Lookup id/name from filename
    base = os.path.basename(pdf_path).replace("Plan de Estudios - ", "").replace(".pdf", "")
    info = FILENAME_INFO.get(base)
    if not info:
        info = (base.lower(), base)

    carrera_id, carrera_nombre = info

    # Build materias array (only data we keep)
    materias = []
    seen_nros = set()
    topicos_total = 0
    talleres_total = 0

    for group_name, items in raw_groups.items():
        grupo_key = GROUP_MAP.get(group_name)
        if not grupo_key:
            continue
        # Aggressive cleanup for structural groups (obligatoria/tesis/requisito).
        # For topicos/talleres, keep the codes since they hint at cross-carrera sharing.
        aggressive = grupo_key in ("obligatoria", "tesis", "requisito")
        for item in items:
            nro = item["nro"]
            if nro in seen_nros:
                continue
            seen_nros.add(nro)
            materias.append({
                "nro": nro,
                "nombre": clean_name(item["nombre"], aggressive=aggressive),
                "anio": item["anio"],
                "cuatrimestre": normalize_cuatrimestre(item["cuatrimestre"], nro, item["nombre"]),
                "grupo": grupo_key,
                "correlativas": [],
                "creditos": item["creditos"],
            })
            if grupo_key == "topico":
                topicos_total += 1
            elif grupo_key == "taller":
                talleres_total += 1

    # Apply correlativas
    nro_to_idx = {m["nro"]: i for i, m in enumerate(materias)}
    for materia_nro, correl_nro in correlativas:
        if materia_nro in nro_to_idx and correl_nro in nro_to_idx:
            mat = materias[nro_to_idx[materia_nro]]
            if correl_nro not in mat["correlativas"]:
                mat["correlativas"].append(correl_nro)

    # Determine required topicos/talleres from page metadata if available
    # For now, use total counts as a fallback (will be approximated)
    # TODO: extract these from "Materias: N" annotation per group

    # Required topicos/talleres come from "Materias: N" in the group header.
    # The PDFs list ALL available topicos/talleres but you only need N.
    topicos_req = group_required.get("Tópico", group_required.get("Topico", 0))
    talleres_req = group_required.get("Taller", 0)

    return {
        "id": carrera_id,
        "nombre": carrera_nombre,
        "programa": programa,
        "plan": plan,
        "resolucion": resolucion,
        "titulo": titulo,
        "anios": determine_anios(materias),
        "materias": materias,
        "topicos_requeridos": topicos_req if topicos_req > 0 else (min(4, topicos_total) if topicos_total > 0 else 0),
        "talleres_requeridos": talleres_req if talleres_req > 0 else (min(3, talleres_total) if talleres_total > 0 else 0),
    }


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    write = "--write" in sys.argv
    pdfs = sorted([f for f in os.listdir(PDF_DIR) if f.lower().endswith(".pdf") and "Reglamento" not in f])
    results = []
    for pdf_file in pdfs:
        if only and only not in pdf_file and only != "--write":
            continue
        pdf_path = os.path.join(PDF_DIR, pdf_file)
        try:
            parsed = parse_plan(pdf_path)
            carrera = build_carrera(pdf_path, parsed)
            obls = sum(1 for m in carrera["materias"] if m["grupo"] == "obligatoria")
            tops = sum(1 for m in carrera["materias"] if m["grupo"] == "topico")
            tals = sum(1 for m in carrera["materias"] if m["grupo"] == "taller")
            tess = sum(1 for m in carrera["materias"] if m["grupo"] == "tesis")
            reqs = sum(1 for m in carrera["materias"] if m["grupo"] == "requisito")
            corrs = sum(len(m["correlativas"]) for m in carrera["materias"])
            print(f"OK  {pdf_file}: id={carrera['id']} obl={obls} top={tops}/{carrera['topicos_requeridos']} tal={tals}/{carrera['talleres_requeridos']} tes={tess} req={reqs} corr={corrs}")
            results.append((pdf_file, carrera))
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"ERR {pdf_file}: {e}", file=sys.stderr)

    if write:
        os.makedirs(OUT_DIR, exist_ok=True)
        # Filter: skip "old" plans for the index
        index_carreras = []
        for pdf_file, carrera in results:
            out_path = os.path.join(OUT_DIR, f"{carrera['id']}.json")
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(carrera, f, ensure_ascii=False, indent=2)
            print(f"  -> wrote {out_path}")
            if not carrera["id"].endswith("-old") and not carrera["id"].endswith("-2025") and not carrera["id"].endswith("-m"):
                index_carreras.append({
                    "id": carrera["id"],
                    "nombre": carrera["nombre"],
                    "archivo": f"{carrera['id']}.json",
                    "planEstudio": pdf_file,
                })
        # Sort: ingenieria first, then alphabetical
        index_carreras.sort(key=lambda c: (0 if "ingenieria" in c["id"] else 1, c["nombre"]))
        index_data = {"universidad": "UCEMA", "carreras": index_carreras}
        index_path = os.path.join(OUT_DIR, "index.json")
        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(index_data, f, ensure_ascii=False, indent=2)
        print(f"  -> wrote {index_path} with {len(index_carreras)} carreras")
    return results


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    main()
