from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[1]
ASSETS = PROJECT / "www" / "assets"
OUTPUT = ASSETS / "zivotinja-owl-animation"
GENERATED = Path(
    r"C:\Users\andri\.codex\generated_images\019f5164-ee46-74c1-a156-9cb966faf6a6"
)
CANVAS_SIZE = (941, 1672)


def sharpen_preserving_alpha(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    rgb = image.convert("RGB").filter(
        ImageFilter.UnsharpMask(radius=0.55, percent=65, threshold=2)
    )
    rgb.putalpha(alpha)
    return rgb


def crop_with_margin(image: Image.Image, bbox, margin=4):
    left, top, right, bottom = bbox
    expanded = (
        max(0, left - margin),
        max(0, top - margin),
        min(image.width, right + margin),
        min(image.height, bottom + margin),
    )
    return image.crop(expanded), expanded


def place_component(canvas, source, bbox, scale, source_anchor, target_anchor):
    crop, expanded = crop_with_margin(source, bbox)
    width = max(1, round(crop.width * scale))
    height = max(1, round(crop.height * scale))
    crop = crop.resize((width, height), Image.Resampling.LANCZOS)
    crop = sharpen_preserving_alpha(crop)

    source_left, source_top, _, _ = expanded
    target_left = round(target_anchor[0] + (source_left - source_anchor[0]) * scale)
    target_top = round(target_anchor[1] + (source_top - source_anchor[1]) * scale)
    canvas.alpha_composite(crop, (target_left, target_top))


def save_body():
    source = Image.open(ROOT / "body-alpha.png").convert("RGBA")
    canvas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    place_component(
        canvas,
        source,
        bbox=(118, 584, 278, 780),
        scale=0.815,
        source_anchor=(187.1, 648.8),
        target_anchor=(187.0, 637.1),
    )
    canvas.save(OUTPUT / "owl-body-v2.png", optimize=True)


def save_wings(filename, source_name, components):
    source = Image.open(ROOT / source_name).convert("RGBA")
    canvas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    for component in components:
        place_component(canvas, source, **component)
    canvas.save(OUTPUT / filename, optimize=True)


def save_clean_background():
    base = Image.open(ASSETS / "zivotinja-soft-matte-bg-cloudless-v3.png").convert("RGBA")
    clean = Image.open(
        GENERATED / "exec-de908ed9-c12a-4588-aa49-0ceb2dda0d45.png"
    ).convert("RGBA")
    if base.size != CANVAS_SIZE or clean.size != CANVAS_SIZE:
        raise ValueError(f"Unexpected background sizes: {base.size=} {clean.size=}")

    # Only the owl's immediate area is taken from the clean image. The soft edge
    # keeps every untouched animal and the rest of the original render identical.
    mask = Image.new("L", CANVAS_SIZE, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((92, 548, 292, 792), radius=48, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(11))
    result = Image.composite(clean, base, mask)
    result.save(
        ASSETS / "zivotinja-soft-matte-bg-owl-clean-v4.png",
        optimize=True,
    )


def save_previews():
    background = Image.open(
        ASSETS / "zivotinja-soft-matte-bg-owl-clean-v4.png"
    ).convert("RGBA")
    body = Image.open(OUTPUT / "owl-body-v2.png").convert("RGBA")
    frames = []
    for name in ("closed", "half", "open"):
        frame = background.copy()
        frame.alpha_composite(
            Image.open(OUTPUT / f"owl-wings-{name}-v2.png").convert("RGBA")
        )
        frame.alpha_composite(body)
        frame.save(ROOT / f"preview-v2-{name}.png", optimize=True)
        frames.append(frame.crop((20, 500, 380, 820)))

    contact = Image.new("RGB", (360 * 3, 320), "#dfe8ee")
    for index, frame in enumerate(frames):
        contact.paste(frame.convert("RGB"), (index * 360, 0))
    contact.save(ROOT / "preview-v2-contact-sheet.jpg", quality=96, subsampling=0)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    save_clean_background()
    save_body()
    save_wings(
        "owl-wings-closed-v2.png",
        "wings-closed-alpha.png",
        [
            {
                "bbox": (100, 671, 169, 775),
                "scale": 0.75,
                "source_anchor": (160, 685),
                "target_anchor": (151, 654),
            },
            {
                "bbox": (301, 678, 340, 760),
                "scale": 0.75,
                "source_anchor": (307, 688),
                "target_anchor": (244, 654),
            },
        ],
    )
    save_wings(
        "owl-wings-half-v2.png",
        "wings-half-alpha.png",
        [
            {
                "bbox": (117, 605, 325, 779),
                "scale": 0.48,
                "source_anchor": (315, 690),
                "target_anchor": (151, 656),
            },
            {
                "bbox": (639, 608, 820, 777),
                "scale": 0.48,
                "source_anchor": (649, 692),
                "target_anchor": (241, 659),
            },
        ],
    )
    save_wings(
        "owl-wings-open-v2.png",
        "wings-open-alpha.png",
        [
            {
                "bbox": (101, 529, 393, 953),
                "scale": 0.36,
                "source_anchor": (380, 860),
                "target_anchor": (151, 662),
            },
            {
                "bbox": (563, 534, 837, 947),
                "scale": 0.36,
                "source_anchor": (576, 858),
                "target_anchor": (242, 665),
            },
        ],
    )
    save_previews()


if __name__ == "__main__":
    main()
