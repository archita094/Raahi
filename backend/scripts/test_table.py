from pathlib import Path
import pdfplumber

BASE_DIR = Path(__file__).resolve().parent.parent
PDF_PATH = BASE_DIR / "data" / "ctu_timetable.pdf"

with pdfplumber.open(PDF_PATH) as pdf:

    page = pdf.pages[0]

    print("PAGE SIZE:")
    print(page.width, page.height)

    print("\nTABLES FOUND:")

    tables = page.extract_tables()

    print("Number of tables:", len(tables))

    for table_index, table in enumerate(tables):

        print("\n" + "=" * 100)
        print("TABLE", table_index + 1)
        print("=" * 100)

        for row in table[:10]:
            print(row)