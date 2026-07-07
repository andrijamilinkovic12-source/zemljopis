from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageStat


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "www" / "assets"
TMP = ROOT / "tmp"


THEMES = [
    ("grad", "grad-soft-matte-bg-reka-tuned.png", "grad-soft-matte-bg-reka-clean.png", 0.22, 0.085, 76),
    ("drzava", "drzava-soft-matte-bg-reka-tuned.png", "drzava-soft-matte-bg-reka-clean.png", 0.20, 0.080, 68),
    ("planina", "planina-soft-matte-bg-reka-tuned.png", "planina-soft-matte-bg-reka-clean.png", 0.30, 0.135, 112),
    ("biljka", "biljka-soft-matte-bg-reka-tuned.png", "biljka-soft-matte-bg-reka-clean.png", 0.30, 0.110, 92),
    ("zivotinja", "zivotinja-soft-matte-bg-reka-tuned.png", "zivotinja-soft-matte-bg-reka-clean.png", 0.28, 0.105, 88),
    ("predmet", "predmet-soft-matte-bg-reka-tuned.png", "predmet-soft-matte-bg-reka-clean.png", 0.30, 0.125, 104),
]


def metric_snapshot(image):
    sample = image.convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    gray = sample.convert("L")
    edges = gray.filter(ImageFilter.FIND_EDGES)
    hsv = sample.convert("HSV")
    rgb_mean = ImageStat.Stat(sample).mean
    return {
        "sharp": ImageStat.Stat(edges).mean[0],
        "contrast": ImageStat.Stat(gray).stddev[0],
        "sat": ImageStat.Stat(hsv).mean[1],
        "bright": ImageStat.Stat(gray).mean[0],
        "warm": (rgb_mean[0] + rgb_mean[1]) / 2 - rgb_mean[2],
    }


def edge_preserving_clean(image, flat_blend, clarity, unsharp_percent):
    rgb = image.convert("RGB")

    smoothed = rgb.filter(ImageFilter.MedianFilter(size=3)).filter(
        ImageFilter.GaussianBlur(radius=0.34)
    )

    gray = rgb.convert("L")
    edges = gray.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(radius=1.1))
    edge_arr = np.asarray(edges, dtype=np.float32) / 255.0
    flat_mask = np.clip(1.0 - edge_arr * 4.35, 0.0, 1.0) ** 1.45
    flat_mask = flat_mask[..., None] * flat_blend

    base = np.asarray(rgb, dtype=np.float32)
    smooth = np.asarray(smoothed, dtype=np.float32)
    cleaned = base * (1.0 - flat_mask) + smooth * flat_mask

    interim = Image.fromarray(np.clip(cleaned, 0, 255).astype(np.uint8), "RGB")
    low = interim.filter(ImageFilter.GaussianBlur(radius=13.0))
    interim_arr = np.asarray(interim, dtype=np.float32)
    low_arr = np.asarray(low, dtype=np.float32)
    clarity_arr = interim_arr + (interim_arr - low_arr) * clarity
    result = Image.fromarray(np.clip(clarity_arr, 0, 255).astype(np.uint8), "RGB")

    before = metric_snapshot(result)
    contrast_factor = 1.0 + max(-0.015, min(0.055, (46.3 - before["contrast"]) / 46.3 * 0.22))
    color_factor = 1.0 + max(0.015, min(0.095, (146.0 - before["sat"]) / 146.0 * 0.38))
    brightness_factor = 1.0 + max(-0.010, min(0.012, (143.5 - before["bright"]) / 255.0 * 0.16))

    result = ImageEnhance.Contrast(result).enhance(contrast_factor)
    result = ImageEnhance.Color(result).enhance(color_factor)
    result = ImageEnhance.Brightness(result).enhance(brightness_factor)
    result = result.filter(
        ImageFilter.UnsharpMask(radius=1.35, percent=unsharp_percent, threshold=4)
    )
    result = ImageEnhance.Sharpness(result).enhance(1.05)

    return result


def build_preview(rows):
    thumb_w, thumb_h = 150, 267
    label_h = 24
    pad = 14
    cols = 4
    rows_count = 3
    canvas = Image.new(
        "RGB",
        (pad + (thumb_w * 2 + pad * 2) * cols, pad + (thumb_h + label_h + pad) * rows_count),
        (245, 248, 246),
    )
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()

    for idx, (name, old_img, new_img) in enumerate(rows):
        col = idx % cols
        row = idx // cols
        x = pad + col * (thumb_w * 2 + pad * 2)
        y = pad + row * (thumb_h + label_h + pad)
        draw.text((x, y), f"{name.upper()} OLD", fill=(30, 50, 60), font=font)
        draw.text((x + thumb_w + pad, y), "CLEAN", fill=(30, 90, 70), font=font)
        old_thumb = old_img.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        new_thumb = new_img.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        canvas.paste(old_thumb, (x, y + label_h))
        canvas.paste(new_thumb, (x + thumb_w + pad, y + label_h))

    out = TMP / "theme-clean-pass-comparison.png"
    canvas.save(out, quality=95)
    return out


def main():
    TMP.mkdir(exist_ok=True)
    rows = []
    print("theme\tsharp old->new\tcontrast old->new\tsat old->new\tbright old->new")
    for name, src_name, out_name, flat_blend, clarity, unsharp_percent in THEMES:
        src = ASSETS / src_name
        dst = ASSETS / out_name
        old_img = Image.open(src).convert("RGB")
        new_img = edge_preserving_clean(old_img, flat_blend, clarity, unsharp_percent)
        new_img.save(dst, optimize=True)
        rows.append((name, old_img, new_img))
        old_m = metric_snapshot(old_img)
        new_m = metric_snapshot(new_img)
        print(
            f"{name}\t"
            f"{old_m['sharp']:.2f}->{new_m['sharp']:.2f}\t"
            f"{old_m['contrast']:.2f}->{new_m['contrast']:.2f}\t"
            f"{old_m['sat']:.2f}->{new_m['sat']:.2f}\t"
            f"{old_m['bright']:.2f}->{new_m['bright']:.2f}"
        )

    preview = build_preview(rows)
    print(preview)


if __name__ == "__main__":
    main()
