from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[1]
SOURCE = PROJECT / "www" / "assets" / "zivotinja-source-pack"

final = np.asarray(Image.open(SOURCE / "zivotinja-final-reference.png").convert("RGB")).astype(np.int16)
clean = np.asarray(Image.open(SOURCE / "zivotinja-clean-plate.png").convert("RGB")).astype(np.int16)
ids = np.asarray(Image.open(SOURCE / "zivotinja-object-id-map.png").convert("RGB")).astype(np.int16)

body = np.abs(ids - np.array((255, 91, 46), dtype=np.int16)).max(axis=2) <= 3
tail = np.abs(ids - np.array((255, 177, 46), dtype=np.int16)).max(axis=2) <= 3
coarse = body | tail
diff = np.abs(final - clean).mean(axis=2)

yy, xx = np.indices(diff.shape)
fox_box = (xx < 300) & (yy >= 820) & (yy < 1235)
ring = fox_box & ~coarse
for name, mask in (("body", body), ("tail", tail), ("coarse", coarse), ("ring", ring)):
    values = diff[mask]
    print(name, np.round(np.quantile(values, (0, .1, .25, .5, .75, .9, .98, 1)), 1))

source_image = Image.fromarray(final.astype(np.uint8), "RGB")
states = []
for threshold in (18, 26, 34, 42):
    mask = fox_box & (diff >= threshold)
    overlay = source_image.convert("RGBA")
    tint = Image.new("RGBA", source_image.size, (255, 0, 255, 0))
    tint.putalpha(Image.fromarray(np.where(mask, 120, 0).astype(np.uint8), "L"))
    overlay.alpha_composite(tint)
    states.append((f"T{threshold}", overlay))

crop = (0, 800, 340, 1240)
sheet = Image.new("RGB", (340 * len(states), 470), "#1d2730")
draw = ImageDraw.Draw(sheet)
for index, (label, frame) in enumerate(states):
    sheet.paste(frame.crop(crop).convert("RGB"), (index * 340, 0))
    draw.text((index * 340 + 12, 446), label, fill="white")
sheet.save(ROOT / "diff-mask-contact.jpg", quality=96, subsampling=0)
