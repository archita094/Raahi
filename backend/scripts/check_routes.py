from pathlib import Path
import json
import pdfplumber

BASE_DIR = Path(__file__).resolve().parent.parent

PDF_FILE = BASE_DIR / "data" / "ctu_timetable.pdf"
OUTPUT_FILE = BASE_DIR / "data" / "routes_raw.json"

routes = []

with pdfplumber.open(PDF_FILE) as pdf:

    for page_number, page in enumerate(pdf.pages, start=1):

        tables = page.extract_tables()

        if not tables:
            continue

        table = tables[0]

        for row in table:

            if not row or len(row) < 7:
                continue

            sr_no = row[0]
            route_number = row[1]

            if not sr_no or not route_number:
                continue

            if "Sr.N" in sr_no:
                continue

            routes.append({
                "srNo": sr_no.strip(),
                "routeNumber": route_number.strip(),
                "description": (row[2] or "").strip(),
                "time": (row[3] or "").strip(),
                "frequency": (row[4] or "").strip(),
                "lengthKm": (row[5] or "").strip(),
                "busCount": (row[6] or "").strip(),
                "page": page_number
            })

OUTPUT_FILE.write_text(
    json.dumps(
        routes,
        indent=2,
        ensure_ascii=False
    ),
    encoding="utf-8"
)

print("Routes found:", len(routes))
print("Saved to:", OUTPUT_FILE)

print("\nRoutes:")

for route in routes:
    print(
        f"{route['srNo']:>2} | "
        f"{route['routeNumber']:<6} | "
        f"{route['lengthKm']:<6} km | "
        f"{route['busCount']:<3} buses"
    )