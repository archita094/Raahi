from pathlib import Path
import json

BASE_DIR = Path(__file__).resolve().parent.parent
FILE = BASE_DIR / "data" / "routes_parsed.json"

routes = json.loads(
    FILE.read_text(
        encoding="utf-8"
    )
)

for r in routes:

    print(
        f"{r['srNo']:>2} | "
        f"{r['routeNumber']:<12} | "
        f"{str(r['source']):<25} | "
        f"{str(r['destination']):<30} | "
        f"freq={r['frequency']} | "
        f"km={r['lengthKm']} | "
        f"buses={r['busCount']}"
    )