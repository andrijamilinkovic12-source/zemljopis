from math import cos, radians, sin
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[1]
ASSETS = PROJECT / "www" / "assets"
OUTPUT = ASSETS / "zivotinja-fox-animation"
SIZE = (941, 1672)

TAIL_TARGET = (18, 1052, 183, 1208)
TAIL_PIVOT_PCT = (0.75, 0.18)


def largest_component(mask, box):
    left, top, right, bottom = box
    crop = mask[top:bottom, left:right]
    seen = np.zeros_like(crop, dtype=bool)
    components = []
    for start_y, start_x in zip(*np.nonzero(crop)):
        if seen[start_y, start_x]:
            continue
        stack = [(int(start_y), int(start_x))]
        seen[start_y, start_x] = True
        points = []
        while stack:
            y, x = stack.pop()
            points.append((y, x))
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < crop.shape[0] and 0 <= nx < crop.shape[1] and crop[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        components.append(points)

    result = np.zeros_like(mask, dtype=bool)
    if components:
        for y, x in max(components, key=len):
            result[top + y, left + x] = True
    return result


def fill_holes(mask, box):
    left, top, right, bottom = box
    crop = mask[top:bottom, left:right]
    exterior = np.zeros_like(crop, dtype=bool)
    stack = []
    for x in range(crop.shape[1]):
        stack.extend(((0, x), (crop.shape[0] - 1, x)))
    for y in range(crop.shape[0]):
        stack.extend(((y, 0), (y, crop.shape[1] - 1)))
    while stack:
        y, x = stack.pop()
        if exterior[y, x] or crop[y, x]:
            continue
        exterior[y, x] = True
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < crop.shape[0] and 0 <= nx < crop.shape[1]:
                stack.append((ny, nx))
    result = mask.copy()
    result[top:bottom, left:right] |= ~crop & ~exterior
    return result


def fox_body_mask(image):
    pixels = np.asarray(image.convert("RGB")).astype(np.int16)
    red, green, blue = pixels[..., 0], pixels[..., 1], pixels[..., 2]
    orange = (red >= 95) & ((red - green) >= 24) & ((green - blue) >= 10)
    cream = (red >= 150) & (green >= 105) & ((red - green) >= 4) & ((green - blue) >= 15)
    yy, xx = np.indices(red.shape)
    region = (xx >= 60) & (xx < 292) & (yy >= 865) & (yy < 1220)
    seed = (orange | cream) & region
    seed_image = Image.fromarray(np.where(seed, 255, 0).astype(np.uint8), "L")
    near = np.asarray(seed_image.filter(ImageFilter.MaxFilter(13))) > 0
    luminance = pixels.mean(axis=2)
    dark = (luminance < 130) & (red >= green - 15) & (green >= blue - 15) & near & region
    candidate = seed | dark
    candidate_image = Image.fromarray(np.where(candidate, 255, 0).astype(np.uint8), "L")
    candidate_image = candidate_image.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    component = largest_component(np.asarray(candidate_image) > 0, (60, 865, 292, 1220))
    component = fill_holes(component, (60, 865, 292, 1220))
    mask = Image.fromarray(np.where(component, 255, 0).astype(np.uint8), "L")
    return mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.65))


def prepared_tail():
    source = Image.open(ROOT / "fox-tail-clay-alpha.png").convert("RGBA")
    bbox = source.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("Tail source has no alpha content")
    left, top, right, bottom = bbox
    crop = source.crop((max(0, left - 4), max(0, top - 4), min(source.width, right + 4), min(source.height, bottom + 4)))
    crop.save(OUTPUT / "fox-tail-v2.png", optimize=True)

    pixels = np.asarray(crop).copy()
    yy, xx = np.indices(pixels.shape[:2])
    white = (
        (pixels[..., 1] > 150)
        & (pixels[..., 2] > 125)
        & (pixels[..., 3] > 0)
        & (xx > crop.width * 0.45)
        & (yy > crop.height * 0.55)
    )
    white_mask = Image.fromarray(np.where(white, 255, 0).astype(np.uint8), "L")
    white_mask = white_mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    tip_alpha = ImageChops.multiply(crop.getchannel("A"), white_mask)
    tip = crop.copy()
    tip.putalpha(tip_alpha)
    tip.save(OUTPUT / "fox-tail-tip-v2.png", optimize=True)
    return crop, tip


def tail_canvas(tail, angle):
    left, top, right, bottom = TAIL_TARGET
    width, height = right - left, bottom - top
    sprite = tail.resize((width, height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    canvas.alpha_composite(sprite, (left, top))
    pivot_x = left + width * TAIL_PIVOT_PCT[0]
    pivot_y = top + height * TAIL_PIVOT_PCT[1]
    theta = radians(angle)
    cosine, sine = cos(theta), sin(theta)
    inverse = (
        cosine,
        sine,
        pivot_x - cosine * pivot_x - sine * pivot_y,
        -sine,
        cosine,
        pivot_y + sine * pivot_x - cosine * pivot_y,
    )
    return canvas.transform(
        SIZE,
        Image.Transform.AFFINE,
        inverse,
        resample=Image.Resampling.BICUBIC,
        fillcolor=(0, 0, 0, 0),
    )


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    base = Image.open(ASSETS / "zivotinja-soft-matte-bg-owl-clean-v4.png").convert("RGBA")
    no_tail = Image.open(ROOT / "fox-no-tail-imagegen.png").convert("RGBA")
    if base.size != SIZE or no_tail.size != SIZE:
        raise ValueError(f"Unexpected background dimensions: {base.size=} {no_tail.size=}")

    patch_mask = Image.new("L", SIZE, 0)
    draw = ImageDraw.Draw(patch_mask)
    draw.rounded_rectangle((-24, 820, 322, 1238), radius=54, fill=255)
    patch_mask = patch_mask.filter(ImageFilter.GaussianBlur(11))
    background = Image.composite(no_tail, base, patch_mask)
    background.save(ASSETS / "zivotinja-soft-matte-bg-owl-fox-clean-v6.png", optimize=True)

    body = no_tail.copy()
    body.putalpha(fox_body_mask(no_tail))
    body.save(OUTPUT / "fox-body-v2.png", optimize=True)

    tail, tip = prepared_tail()
    states = [("PRE", base)]
    for label, angle in (("MIRNO", 0), ("MASE 1", -3.5), ("MASE 2", -6.5)):
        frame = background.copy()
        frame.alpha_composite(tail_canvas(tail, angle))
        frame.alpha_composite(body)
        frame.alpha_composite(tail_canvas(tip, angle))
        states.append((label, frame))

    crop = (0, 800, 340, 1240)
    sheet = Image.new("RGB", (340 * len(states), 470), "#1d2730")
    draw = ImageDraw.Draw(sheet)
    for index, (label, frame) in enumerate(states):
        sheet.paste(frame.crop(crop).convert("RGB"), (index * 340, 0))
        draw.text((index * 340 + 12, 446), label, fill="white")
    sheet.save(ROOT / "fox-tail-contact-final-v4.jpg", quality=96, subsampling=0)


if __name__ == "__main__":
    main()
