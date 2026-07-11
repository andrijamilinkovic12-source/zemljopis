from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[1]
ASSETS = PROJECT / "www" / "assets"
ANIMATION = ASSETS / "zivotinja-owl-animation"
CANVAS_SIZE = (941, 1672)


def alpha_bbox(path):
    image = Image.open(path).convert("RGBA")
    return image.size, image.getchannel("A").getbbox()


original = Image.open(ASSETS / "zivotinja-soft-matte-bg-cloudless-v3.png").convert("RGBA")
clean = Image.open(ASSETS / "zivotinja-soft-matte-bg-owl-clean-v4.png").convert("RGBA")
difference = ImageChops.difference(original, clean)

print("background", clean.size, "difference_bbox", difference.getbbox())
assert original.size == clean.size == CANVAS_SIZE
assert difference.crop((0, 0, 50, 500)).getbbox() is None
assert difference.crop((335, 0, 941, 1672)).getbbox() is None
assert difference.crop((0, 835, 941, 1672)).getbbox() is None

for filename in (
    "owl-body-v2.png",
    "owl-wings-closed-v2.png",
    "owl-wings-half-v2.png",
    "owl-wings-open-v2.png",
):
    size, bbox = alpha_bbox(ANIMATION / filename)
    print(filename, size, bbox)
    assert size == CANVAS_SIZE
    assert bbox is not None
