import pdfplumber
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

PDF_PATH = BASE_DIR / "data" / "ctu_timetable.pdf"
OUTPUT_PATH = BASE_DIR / "data" / "timetable_raw.txt"

with pdfplumber.open(PDF_PATH) as pdf:

    with open(OUTPUT_PATH, "w", encoding="utf-8") as output:

        for page_number, page in enumerate(pdf.pages, start=1):

            text = page.extract_text()

            if text:
                output.write(
                    f"\n\n========== PAGE {page_number} ==========\n\n"
                )

                output.write(text)

print("Extraction complete.")
print("Saved to:", OUTPUT_PATH)