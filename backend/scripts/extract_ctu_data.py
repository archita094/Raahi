from pathlib import Path
import json
import re
import pdfplumber

BASE_DIR = Path(__file__).resolve().parent.parent
PDF_FILE = BASE_DIR / "data" / "ctu_timetable.pdf"
OUTPUT_FILE = BASE_DIR / "data" / "routes_parsed.json"

def clean_text(text):
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def parse_number(val):
    if not val:
        return None
    val = clean_text(val)
    match = re.search(r"(\d+(?:\.\d+)?)", val)
    return float(match.group(1)) if match else None

def parse_int(val):
    if not val:
        return None
    val = clean_text(val)
    match = re.search(r"(\d+)", val)
    return int(match.group(1)) if match else None

def parse_frequency(val):
    if not val:
        return {"min": 20, "max": 30}
    val = clean_text(val)
    match = re.search(r"(\d+)\s*-\s*(\d+)", val)
    if match:
        return {"min": int(match.group(1)), "max": int(match.group(2))}
    match = re.search(r"(\d+)", val)
    if match:
        n = int(match.group(1))
        return {"min": n, "max": n}
    return {"min": 20, "max": 30}

def parse_operating_time(val):
    if not val:
        return {"start": "06:00", "end": "21:00", "raw": None}
    val = clean_text(val)
    times = re.findall(r"(\d{1,2}[\.:]\d{2}\s*(?:AM|PM|hrs|Hrs)?)", val, re.IGNORECASE)
    start = times[0] if len(times) > 0 else "06:00"
    end = times[1] if len(times) > 1 else "21:00"
    return {"start": start, "end": end, "raw": val}

def parse_stops_from_description(desc):
    if not desc:
        return []
    

    desc_clean = re.sub(r"^[0-9A-Z\.\s\/]+TO\s+[^\:]+\:\s*", "", desc, flags=re.IGNORECASE)
    desc_clean = re.sub(r"^\s*via\b[\s\-\:]*", "", desc_clean, flags=re.IGNORECASE)
    desc_clean = re.sub(r"\([^\)]*\)", "", desc_clean)
    

    raw_tokens = re.split(r"[,;]|\s+via\s+", desc_clean, flags=re.IGNORECASE)
    stops = []
    
    for token in raw_tokens:
        tok = clean_text(token)
        if not tok or len(tok) > 40:
            continue

        if tok.lower() in ["via", "to", "vice versa", "hrs", "mins"]:
            continue
        stops.append(tok)
        
    return stops

def process_pdf():
    routes = []
    with pdfplumber.open(PDF_FILE) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            tables = page.extract_tables()
            if not tables:
                continue
            table = tables[0]
            for row in table:
                if not row or len(row) < 7:
                    continue
                sr_no = clean_text(row[0])
                route_num = clean_text(row[1])
                if not sr_no or not route_num or "Sr.N" in sr_no or "Route" in route_num:
                    continue
                
                desc = clean_text(row[2])
                time_str = clean_text(row[3])
                freq_str = clean_text(row[4])
                len_str = clean_text(row[5])
                buses_str = clean_text(row[6])
                

                origin = "Sector 17 ISBT"
                dest = "Sector 43 ISBT"
                match_to = re.search(r"^\s*(.+?)\s+TO\s+(.+?)(?=\s+via\b|\s*:\s*|$)", desc, re.IGNORECASE)
                if match_to:
                    origin = clean_text(match_to.group(1))
                    dest = clean_text(match_to.group(2))
                
                stops_list = parse_stops_from_description(desc)

                if not stops_list or stops_list[0].lower() != origin.lower():
                    stops_list.insert(0, origin)
                if stops_list[-1].lower() != dest.lower():
                    stops_list.append(dest)
                
                op_time = parse_operating_time(time_str)
                
                route_obj = {
                    "srNo": sr_no,
                    "routeNumber": route_num,
                    "source": origin,
                    "destination": dest,
                    "description": desc,
                    "stops": stops_list,
                    "operatingTime": op_time,
                    "frequencyMinutes": parse_frequency(freq_str),
                    "distanceKm": parse_number(len_str) or 15.0,
                    "numberOfBuses": parse_int(buses_str) or 4,
                    "dataSource": "CTU timetable",
                    "sourceDate": "2026-07-25",
                    "page": page_num
                }
                routes.append(route_obj)
                
    print(f"Successfully extracted {len(routes)} CTU routes from PDF.")
    OUTPUT_FILE.write_text(json.dumps(routes, indent=2, ensure_ascii=False), encoding="utf-8")
    return routes

if __name__ == "__main__":
    process_pdf()
