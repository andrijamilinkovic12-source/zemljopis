from pathlib import Path
from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "www" / "assets"
base = Image.open(ASSETS / "zivotinja-owl-gsap" / "zivotinja-bg-fox-tail-owl-static-v1.png").convert("RGBA")
clean = Image.open(ASSETS / "zivotinja-soft-matte-bg-owl-clean-v4.png").convert("RGBA")

polygons = {
    "left": [
        (149, 646), (158, 651), (166, 660), (170, 674), (170, 690),
        (166, 705), (159, 717), (150, 724), (140, 726), (127, 722),
        (114, 716), (104, 705), (98, 693), (99, 680), (105, 666),
        (116, 653), (130, 646), (141, 644),
    ],
    "right": [
        (232, 665), (240, 669), (247, 678), (250, 689), (248, 702),
        (243, 714), (236, 722), (228, 727), (219, 727), (216, 722),
        (220, 720), (225, 712), (230, 705), (234, 695), (235, 680),
    ],
}

crop_boxes = {
    "left": (104, 640, 176, 732),
    "right": (211, 660, 253, 732),
}

base_rgb = base.convert("RGB")
clean_rgb = clean.convert("RGB")
mask_by_side = {}
for side, polygon in polygons.items():
    shape = Image.new("L", base.size, 0)
    ImageDraw.Draw(shape).polygon(polygon, fill=255)
    result = Image.new("L", base.size, 0)
    shape_pixels = shape.load()
    result_pixels = result.load()
    base_pixels = base_rgb.load()
    clean_pixels = clean_rgb.load()
    for y in range(base.height):
        for x in range(base.width):
            if not shape_pixels[x, y]:
                continue
            if (side == "left" and y >= 725) or (side == "right" and y >= 728):
                continue
            difference = max(abs(base_pixels[x, y][i] - clean_pixels[x, y][i]) for i in range(3))
            if difference >= 10:
                result_pixels[x, y] = 255
    mask_by_side[side] = result
    result.save(ROOT / "tmp" / f"owl-{side}-hand-mask.png")

background = base.copy()
background_pixels = background.load()
clean_pixels = clean.load()
wing_assets = {}
for side, mask in mask_by_side.items():
    bbox = mask.getbbox()
    if bbox is None:
        raise RuntimeError(f"{side} wing mask is empty")
    padded_box = crop_boxes[side]
    x0, y0, x1, y1 = padded_box
    wing = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
    wing_pixels = wing.load()
    mask_pixels = mask.load()
    for y in range(bbox[1], bbox[3]):
        for x in range(bbox[0], bbox[2]):
            if not mask_pixels[x, y]:
                continue
            wing_pixels[x - x0, y - y0] = base.getpixel((x, y))
            # Keep the shoulder rooted in the original body while the outer feather area moves.
            should_remove = (side == "left" and x < 155) or (side == "right" and x > 225)
            if should_remove:
                background_pixels[x, y] = clean_pixels[x, y]
    wing_assets[side] = (wing, padded_box)

output_dir = ASSETS / "zivotinja-owl-gsap"
background_path = output_dir / "zivotinja-bg-fox-tail-owl-wings-isolated-v3.png"
background.save(background_path)
for side, (wing, _) in wing_assets.items():
    wing.save(output_dir / f"owl-wing-{side}-isolated-v3.png")

rest = background.copy()
for wing, box in wing_assets.values():
    rest.alpha_composite(wing, (box[0], box[1]))
if ImageChops.difference(rest, base).getbbox() is not None:
    raise RuntimeError("Owl rest reconstruction differs from the original active background.")
rest.save(ROOT / "tmp" / "owl-wings-isolated-rest-v3.png")

pivots = {"left": (152, 655), "right": (233, 668)}
angles = {"left": 4.8, "right": -4.5}
peak = background.copy()
for side, (wing, box) in wing_assets.items():
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    layer.alpha_composite(wing, (box[0], box[1]))
    layer = layer.rotate(angles[side], resample=Image.Resampling.BICUBIC, center=pivots[side])
    peak.alpha_composite(layer)
peak.save(ROOT / "tmp" / "owl-wings-isolated-peak-v3.png")
peak.crop((80, 620, 260, 750)).resize((1080, 780), Image.Resampling.NEAREST).save(ROOT / "tmp" / "owl-wings-isolated-peak-zoom-v3.png")

for side, (_, box) in wing_assets.items():
    print(f"{side}: box={box}, pivot={pivots[side]}")
print(f"background: {background_path.name}")

overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
for side, color in (("left", (0, 255, 255, 135)), ("right", (255, 0, 255, 135))):
    tint = Image.new("RGBA", base.size, color)
    tint.putalpha(mask_by_side[side].point(lambda value, alpha=color[3]: value * alpha // 255))
    overlay = Image.alpha_composite(overlay, tint)
Image.alpha_composite(base, overlay).save(ROOT / "tmp" / "owl-hand-mask-overlay.png")
