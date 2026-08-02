from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream, NameObject

source = Path("tmp/world_map_4651_r4_jul26.pdf")
target = Path("tmp/world_map_4651_r4_jul26_no_text.pdf")

reader = PdfReader(source)
writer = PdfWriter()

for page in reader.pages:
    stream = ContentStream(page.get_contents(), reader)
    kept = []
    text_depth = 0
    for operands, operator in stream.operations:
        if operator == b"BT":
            text_depth += 1
            continue
        if operator == b"ET":
            text_depth = max(0, text_depth - 1)
            continue
        if text_depth == 0:
            kept.append((operands, operator))
    stream.operations = kept
    page[NameObject("/Contents")] = stream
    writer.add_page(page)

with target.open("wb") as output:
    writer.write(output)
