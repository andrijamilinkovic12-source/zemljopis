from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[1]
ASSETS = PROJECT / "www" / "assets"
CROP = (0, 970, 250, 1240)


sources = [
    ("ACTIVE", ASSETS / "zivotinja-soft-matte-bg-owl-clean-v4.png"),
    ("REFERENCE", ASSETS / "zivotinja-source-pack" / "zivotinja-final-reference.png"),
    ("NO TAIL", ROOT / "fox-no-tail-imagegen.png"),
    ("CLEAN PLATE", ASSETS / "zivotinja-source-pack" / "zivotinja-clean-plate.png"),
    ("ID MAP", ASSETS / "zivotinja-source-pack" / "zivotinja-object-id-map.png"),
]

tile_w = CROP[2] - CROP[0]
tile_h = CROP[3] - CROP[1]
sheet = Image.new("RGB", (tile_w * len(sources), tile_h + 28), "#1d2730")
draw = ImageDraw.Draw(sheet)
for index, (label, path) in enumerate(sources):
    image = Image.open(path).convert("RGB")
    sheet.paste(image.crop(CROP), (index * tile_w, 0))
    draw.text((index * tile_w + 8, tile_h + 7), label, fill="white")

sheet.save(ROOT / "original-tail-source-comparison.jpg", quality=98, subsampling=0)
