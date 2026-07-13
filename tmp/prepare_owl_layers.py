from pathlib import Path
from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "www" / "assets"
OUTPUT = ASSETS / "zivotinja-owl-gsap"

base = Image.open(OUTPUT / "zivotinja-bg-fox-tail-owl-static-v1.png").convert("RGBA")
clean = Image.open(ASSETS / "zivotinja-soft-matte-bg-owl-clean-v4.png").convert("RGBA")
id_map = Image.open(ASSETS / "zivotinja-source-pack" / "zivotinja-object-id-map.png").convert("RGB")

if base.size != clean.size or base.size != id_map.size:
    raise RuntimeError("Owl source images must have matching canvas sizes.")

WING_ID = (132, 56, 255)
LEFT_SPLIT_X = 180
width, height = base.size
base_pixels = base.load()
clean_pixels = clean.load()
id_pixels = id_map.load()
background = base.copy()
background_pixels = background.load()

wing_points = {"left": [], "right": []}
for y in range(height):
    for x in range(width):
        if id_pixels[x, y] != WING_ID:
            continue
        side = "left" if x < LEFT_SPLIT_X else "right"
        wing_points[side].append((x, y))
        # The clean owl plate is pixel-aligned with the active animal background.
        background_pixels[x, y] = clean_pixels[x, y]

if not wing_points["left"] or not wing_points["right"]:
    raise RuntimeError("The source ID map did not contain both owl wing masks.")

OUTPUT.mkdir(parents=True, exist_ok=True)
background_path = OUTPUT / "zivotinja-bg-fox-tail-owl-wings-clean-v2.png"
background.save(background_path)

wing_assets = {}
for side, points in wing_points.items():
    min_x = min(x for x, _ in points)
    max_x = max(x for x, _ in points)
    min_y = min(y for _, y in points)
    max_y = max(y for _, y in points)
    crop_box = (min_x, min_y, max_x + 1, max_y + 1)
    wing = Image.new("RGBA", (crop_box[2] - crop_box[0], crop_box[3] - crop_box[1]), (0, 0, 0, 0))
    wing_pixels = wing.load()
    for x, y in points:
        wing_pixels[x - min_x, y - min_y] = base_pixels[x, y]
    path = OUTPUT / f"owl-wing-{side}-clean-v2.png"
    wing.save(path)
    wing_assets[side] = (wing, crop_box, path)

# Regression guard: static reconstruction must be pixel-identical to the original active background.
reconstructed = background.copy()
for wing, crop_box, _ in wing_assets.values():
    reconstructed.alpha_composite(wing, dest=(crop_box[0], crop_box[1]))
if ImageChops.difference(reconstructed, base).getbbox() is not None:
    raise RuntimeError("Owl rest reconstruction differs from the original active background.")

preview = reconstructed.copy()
preview.save(ROOT / "tmp" / "owl-wings-rest-preview-v2.png")

for side, (_, crop_box, path) in wing_assets.items():
    print(f"{side}: box={crop_box}, file={path.name}")
print(f"background: {background_path.name}")
