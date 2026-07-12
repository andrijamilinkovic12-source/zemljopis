import colorsys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter


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


def apply_rgb_scale(image: Image.Image, scales) -> Image.Image:
    image = image.convert("RGBA")
    array = np.asarray(image).copy()
    rgb = array[..., :3].astype(np.float32)
    rgb *= np.asarray(scales, dtype=np.float32)
    array[..., :3] = np.clip(np.rint(rgb), 0, 255).astype(np.uint8)
    array[array[..., 3] == 0, :3] = 0
    return Image.fromarray(array, "RGBA")


def apply_hsv_grade(image, hue_shift, saturation_scale, value_base, value_sat_drop):
    image = image.convert("RGBA")
    array = np.asarray(image).copy()
    mask = array[..., 3] > 0
    colors = array[..., :3][mask].astype(np.float32) / 255.0
    corrected = np.empty_like(colors)
    for index, (red, green, blue) in enumerate(colors):
        hue, saturation, value = colorsys.rgb_to_hsv(red, green, blue)
        saturation = min(1.0, saturation * saturation_scale)
        value *= max(0.0, value_base - value_sat_drop * saturation)
        corrected[index] = colorsys.hsv_to_rgb(
            (hue + hue_shift) % 1.0,
            saturation,
            min(1.0, value),
        )
    array[..., :3][mask] = np.rint(corrected * 255).astype(np.uint8)
    array[array[..., 3] == 0, :3] = 0
    return Image.fromarray(array, "RGBA")


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


def save_continuous_wing_assets():
    open_wings = Image.open(ROOT / "wings-open-alpha.png").convert("RGBA")

    closed_v2 = Image.open(OUTPUT / "owl-wings-closed-v2.png").convert("RGBA")
    apply_rgb_scale(closed_v2, (0.82, 1.10, 0.85)).save(
        OUTPUT / "owl-wings-closed-v3.png", optimize=True
    )

    left_wing = open_wings.crop((97, 525, 397, 957))
    right_wing = open_wings.crop((559, 530, 841, 951))
    apply_rgb_scale(left_wing, (0.82, 1.10, 0.85)).save(
        OUTPUT / "owl-wing-left-v3.png", optimize=True
    )
    apply_rgb_scale(right_wing, (0.82, 1.10, 0.85)).save(
        OUTPUT / "owl-wing-right-v3.png", optimize=True
    )


def save_original_color_assets():
    source = Image.open(OUTPUT / "owl-body-v2.png").convert("RGBA")
    body = apply_hsv_grade(
        source,
        hue_shift=0.025,
        saturation_scale=0.85,
        value_base=0.94,
        value_sat_drop=0.08,
    )
    darker_feathers = apply_hsv_grade(
        source,
        hue_shift=0.028,
        saturation_scale=0.92,
        value_base=0.86,
        value_sat_drop=0.08,
    )
    feather_mask = Image.new("L", CANVAS_SIZE, 0)
    draw = ImageDraw.Draw(feather_mask)
    draw.ellipse((126, 578, 268, 650), fill=178)
    draw.ellipse((126, 640, 268, 753), fill=150)
    draw.ellipse((145, 600, 214, 681), fill=0)
    draw.ellipse((204, 603, 270, 684), fill=0)
    feather_mask = feather_mask.filter(ImageFilter.GaussianBlur(3))
    feather_mask = ImageChops.multiply(feather_mask, source.getchannel("A"))
    body = Image.composite(darker_feathers, body, feather_mask)
    body.save(OUTPUT / "owl-body-v4.png", optimize=True)


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
    save_continuous_wing_assets()
    save_original_color_assets()
    save_previews()


if __name__ == "__main__":
    main()
