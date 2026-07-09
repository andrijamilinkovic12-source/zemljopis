from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "www" / "assets"
OUT = ROOT / "tmp"


def font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        return ImageFont.load_default()


def cover_thumb(path: Path, size: tuple[int, int]) -> Image.Image:
    with Image.open(path) as img:
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


def make_sheet(items: list[tuple[str, Path]], out_path: Path, title: str) -> None:
    thumb = (170, 302)
    pad = 14
    label_h = 44
    title_h = 34
    cols = len(items)
    w = pad + cols * (thumb[0] + pad)
    h = title_h + pad + thumb[1] + label_h + pad
    canvas = Image.new("RGB", (w, h), (240, 240, 240))
    draw = ImageDraw.Draw(canvas)
    draw.text((pad, 8), title, fill=(25, 25, 25), font=font(20))
    for idx, (label, path) in enumerate(items):
        x = pad + idx * (thumb[0] + pad)
        y = title_h + pad
        image = cover_thumb(path, thumb)
        canvas.paste(image, (x, y))
        draw.rectangle((x, y, x + thumb[0] - 1, y + thumb[1] - 1), outline=(70, 70, 70), width=1)
        draw.multiline_text((x, y + thumb[1] + 6), label, fill=(20, 20, 20), font=font(13), spacing=2)
    canvas.save(out_path)


def main() -> None:
    make_sheet(
        [
            ("Biljka old\nsoft-matte-bg", ASSETS / "biljka-soft-matte-bg.png"),
            ("Biljka active\nreka-clean-v2", ASSETS / "biljka-soft-matte-bg-reka-clean-v2.png"),
            ("Zivotinja old\nclean plate", ASSETS / "zivotinja-soft-matte-bg-clean.png"),
            ("Zivotinja final\nreference", ASSETS / "zivotinja-source-pack" / "zivotinja-final-reference.png"),
            ("Zivotinja active\nstatic-clean-v2", ASSETS / "zivotinja-soft-matte-bg-static-clean-v2.png"),
            ("Predmet old\nsoft-matte-bg", ASSETS / "predmet-soft-matte-bg.png"),
            ("Predmet active\nreka-clean-v2", ASSETS / "predmet-soft-matte-bg-reka-clean-v2.png"),
        ],
        OUT / "last3-theme-source-variants.png",
        "Last 3 theme source variants",
    )

    make_sheet(
        [
            ("clean plate", ASSETS / "zivotinja-soft-matte-bg-clean.png"),
            ("final reference", ASSETS / "zivotinja-source-pack" / "zivotinja-final-reference.png"),
            ("active static-clean-v2", ASSETS / "zivotinja-soft-matte-bg-static-clean-v2.png"),
            ("reka-clean-v2", ASSETS / "zivotinja-soft-matte-bg-reka-clean-v2.png"),
            ("draft", ASSETS / "zivotinja-soft-matte-bg-draft.png"),
        ],
        OUT / "zivotinja-source-variants.png",
        "Zivotinja source variants",
    )


if __name__ == "__main__":
    main()
