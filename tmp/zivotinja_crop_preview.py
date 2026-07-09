from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "www" / "assets"
OUT = ROOT / "tmp" / "zivotinja-crop-preview.png"
SOURCE = ASSETS / "zivotinja-soft-matte-bg-static-clean-v2.png"
SHOT = ROOT / ".codex-screenshots" / "background-themes-2026-07-09" / "zivotinja-zivotinja.png"


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
        h = size[1]
        w = round(h * src_ratio)
    else:
        w = size[0]
        h = round(w / src_ratio)
    resized = img.resize((w, h), Image.Resampling.LANCZOS)
    return resized.crop(((w - size[0]) // 2, (h - size[1]) // 2, (w + size[0]) // 2, (h + size[1]) // 2))


def stretch(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    return img.convert("RGB").resize(size, Image.Resampling.LANCZOS)


def fit_width_with_soft_fill(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    img = img.convert("RGB")
    bg = cover(img, size).filter(ImageFilter.GaussianBlur(10))
    bg = ImageEnhance.Brightness(bg).enhance(1.03)
    w = size[0]
    h = round(w * img.height / img.width)
    fg = img.resize((w, h), Image.Resampling.LANCZOS)
    y = (size[1] - h) // 2
    bg.paste(fg, (0, y))
    return bg


def main() -> None:
    size = (150, 325)
    with Image.open(SHOT) as shot:
        current = cover(shot, size)
    with Image.open(SOURCE) as src:
        src = src.convert("RGB")
        variants = [
            ("current render", current),
            ("cover crop\n(current CSS)", cover(src, size)),
            ("stretch full\n(no side crop)", stretch(src, size)),
            ("fit width\nsoft fill", fit_width_with_soft_fill(src, size)),
        ]

    pad = 16
    label_h = 45
    title_h = 38
    width = pad + len(variants) * (size[0] + pad)
    height = title_h + size[1] + label_h + pad
    canvas = Image.new("RGB", (width, height), (238, 238, 238))
    draw = ImageDraw.Draw(canvas)
    draw.text((pad, 9), "Zivotinja crop options", fill=(20, 20, 20), font=font(19))
    for i, (label, img) in enumerate(variants):
        x = pad + i * (size[0] + pad)
        y = title_h
        canvas.paste(img, (x, y))
        draw.rectangle((x, y, x + size[0] - 1, y + size[1] - 1), outline=(80, 80, 80), width=1)
        draw.multiline_text((x, y + size[1] + 6), label, fill=(20, 20, 20), font=font(12), spacing=2)
    canvas.save(OUT)


if __name__ == "__main__":
    main()
