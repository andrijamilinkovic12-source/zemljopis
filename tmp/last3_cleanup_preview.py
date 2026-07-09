from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "www" / "assets"
SHOTS = ROOT / ".codex-screenshots" / "background-themes-2026-07-09"
OUT = ROOT / "tmp" / "last3-cleanup-preview.png"


THEMES = [
    ("Biljka", SHOTS / "biljka-biljka.png", ASSETS / "biljka-soft-matte-bg-reka-clean-v2.png"),
    ("Zivotinja", SHOTS / "zivotinja-zivotinja.png", ASSETS / "zivotinja-soft-matte-bg-static-clean-v2.png"),
    ("Predmet", SHOTS / "predmet-predmet.png", ASSETS / "predmet-soft-matte-bg-reka-clean-v2.png"),
]


def font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        return ImageFont.load_default()


def cover(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    img = img.convert("RGB")
    src_ratio = img.width / img.height
    dst_ratio = size[0] / size[1]
    if src_ratio > dst_ratio:
        new_h = size[1]
        new_w = round(new_h * src_ratio)
    else:
        new_w = size[0]
        new_h = round(new_w / src_ratio)
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    left = (new_w - size[0]) // 2
    top = (new_h - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def clean_variant(img: Image.Image) -> Image.Image:
    img = ImageEnhance.Color(img).enhance(1.14)
    img = ImageEnhance.Contrast(img).enhance(1.07)
    img = ImageEnhance.Brightness(img).enhance(0.985)
    return img


def main() -> None:
    thumb = (150, 325)
    pad = 16
    label_h = 42
    row_h = thumb[1] + label_h + pad
    title_h = 42
    cols = 3
    width = pad + cols * (thumb[0] + pad)
    height = title_h + len(THEMES) * row_h + pad
    canvas = Image.new("RGB", (width, height), (238, 238, 238))
    draw = ImageDraw.Draw(canvas)
    draw.text((pad, 10), "Last 3 themes: current vs cleanup direction", fill=(20, 20, 20), font=font(19))
    col_labels = ["current render", "active asset only", "cleaned direction"]
    for c, label in enumerate(col_labels):
        x = pad + c * (thumb[0] + pad)
        draw.text((x, title_h - 16), label, fill=(35, 35, 35), font=font(12))

    for r, (name, shot_path, asset_path) in enumerate(THEMES):
        y = title_h + r * row_h + pad
        with Image.open(shot_path) as shot:
            current = cover(shot, thumb)
        with Image.open(asset_path) as asset:
            asset_only = cover(asset, thumb)
        cleaned = clean_variant(asset_only)
        for c, img in enumerate([current, asset_only, cleaned]):
            x = pad + c * (thumb[0] + pad)
            canvas.paste(img, (x, y))
            draw.rectangle((x, y, x + thumb[0] - 1, y + thumb[1] - 1), outline=(80, 80, 80), width=1)
        draw.text((pad, y + thumb[1] + 7), name, fill=(20, 20, 20), font=font(14))

    canvas.save(OUT)


if __name__ == "__main__":
    main()
