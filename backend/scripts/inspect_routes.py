from pathlib import Path
import json

BASE_DIR = Path(__file__).resolve().parent.parent
ROUTES_FILE = BASE_DIR / "data" / "routes_raw.json"

routes = json.loads(
    ROUTES_FILE.read_text(encoding="utf-8")
)

for route in routes:
    print("\n" + "=" * 80)
    print(f"SR NO: {route['srNo']}")
    print(f"ROUTE: {route['routeNumber']}")
    print("=" * 80)
    print(route["rawText"])