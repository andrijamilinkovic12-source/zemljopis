"""Register the illustrated clay pieces to the scene's existing animation pivots."""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
source = root / "background-concepts/drzava-clay-redesign"
output = source / "sprites"
output.mkdir(exist_ok=True)


def cell(sheet, index, rows):
    x, y = index % 4, index // 4
    return sheet.crop((round(sheet.width*x/4), round(sheet.height*y/rows),
                       round(sheet.width*(x+1)/4), round(sheet.height*(y+1)/rows)))


def centered(piece, size):
    result = Image.new("RGBA", size)
    result.alpha_composite(piece, ((size[0]-piece.width)//2, (size[1]-piece.height)//2))
    return result


sheet = Image.open(source / "details.png").convert("RGBA")
pieces = [
    ("pin-coral", (188, 188)), ("pin-gold", (188, 188)),
    ("pin-africa", (188, 188)), ("pin-rose", (188, 188)),
    ("cloud-left", (570, 368)), ("cloud-middle", (316, 248)),
    ("cloud-right", (476, 340)), ("compass-needle", (360, 264)),
]
for i, (name, size) in enumerate(pieces):
    piece = cell(sheet, i, 2)
    if i == 7:
        # Square centered on the brass rivet (222, 218) in the source cell.
        # Both renderers project this face-on texture after rotating it.
        piece.crop((52, 48, 392, 388)).resize((264, 264), Image.Resampling.LANCZOS).save(output / f"{name}.png")
        continue
    piece = piece.crop(piece.getbbox())
    if i < 4:
        piece = ImageOps.contain(piece, (150, 148), Image.Resampling.LANCZOS)
    else:
        piece = ImageOps.contain(piece, (round(size[0]*.84), round(size[1]*.72)), Image.Resampling.LANCZOS)
    centered(piece, size).save(output / f"{name}.png")
