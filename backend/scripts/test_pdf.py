import pdfplumber
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PDF_PATH = BASE_DIR / "data" / "ctu_timetable.pdf"

print("Looking for PDF at:", PDF_PATH)

with pdfplumber.open(PDF_PATH) as pdf:
    print("Total pages:", len(pdf.pages))

    for i, page in enumerate(pdf.pages[:3]):
        print("\n==============================")
        print("PAGE", i + 1)
        print("==============================")

        text = page.extract_text()

        if text:
            print(text[:5000])
        else:
            print("NO TEXT FOUND")