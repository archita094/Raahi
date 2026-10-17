from pathlib import Path
import json
import re

BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_FILE = BASE_DIR / "data" / "routes_raw.json"
OUTPUT_FILE = BASE_DIR / "data" / "routes_parsed.json"

def clean_text(text):
    if not text:
        return None

    text = re.sub(r"\s+", " ", text)
    return text.strip()

def parse_number(value):
    if not value:
        return None

    value = value.strip()

    try:
        return float(value)
    except ValueError:
        return None

def parse_bus_count(value):
    if not value:
        return None

    value = value.strip()

    try:
        return int(value)
    except ValueError:
        return None

def extract_route_ends(description):

    if not description:
        return None, None

    match = re.search(
        r"^\s*(.+?)\s+TO\s+(.+?)(?=\s+via\b|\s*:\s*|$)",
        description,
        re.IGNORECASE
    )

    if not match:
        return None, None

    source = clean_text(match.group(1))
    destination = clean_text(match.group(2))

    return source, destination

def parse_frequency(value):

    if not value:
        return None

    value = clean_text(value)

    match = re.search(
        r"(\d+)\s*-\s*(\d+)",
        value
    )

    if match:
        return {
            "min": int(match.group(1)),
            "max": int(match.group(2))
        }

    match = re.search(
        r"(\d+)",
        value
    )

    if match:
        number = int(match.group(1))

        return {
            "min": number,
            "max": number
        }

    return None

def parse_route(route):

    description = clean_text(
        route.get("description")
    )

    source, destination = extract_route_ends(
        description
    )

    return {
        "srNo": route["srNo"],

        "routeNumber": clean_text(
            route["routeNumber"]
        ),

        "source": source,

        "destination": destination,

        "description": description,

        "stops": [],

        "time": clean_text(
            route.get("time")
        ),

        "frequency": parse_frequency(
            route.get("frequency")
        ),

        "lengthKm": parse_number(
            route.get("lengthKm")
        ),

        "busCount": parse_bus_count(
            route.get("busCount")
        ),

        "page": route.get("page")
    }

routes = json.loads(
    INPUT_FILE.read_text(
        encoding="utf-8"
    )
)

parsed_routes = [
    parse_route(route)
    for route in routes
]

OUTPUT_FILE.write_text(
    json.dumps(
        parsed_routes,
        indent=2,
        ensure_ascii=False
    ),
    encoding="utf-8"
)

print(
    f"Parsed routes: {len(parsed_routes)}"
)

print(
    f"Saved to: {OUTPUT_FILE}"
)