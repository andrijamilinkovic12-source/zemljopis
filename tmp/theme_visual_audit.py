from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageStat


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "www" / "assets"
SHOT_DIR = ROOT / ".codex-screenshots" / "background-themes-2026-07-09"

THEME_SHOTS = [
    ("Drzava", SHOT_DIR / "drzava-drzava.png"),
    ("Reka", SHOT_DIR / "okean-reka.png"),
    ("Grad", SHOT_DIR / "grad-grad.png"),
    ("Planina", SHOT_DIR / "planina-planina.png"),
    ("Biljka", SHOT_DIR / "biljka-biljka.png"),
    ("Zivotinja", SHOT_DIR / "zivotinja-zivotinja.png"),
    ("Predmet", SHOT_DIR / "predmet-predmet.png"),
]

ASSET_GROUPS = {
    "biljka": [
        "biljka-soft-matte-bg.png",
        "biljka-soft-matte-bg-reka-clean.png",
        "biljka-soft-matte-bg-reka-clean-v2.png",
        "biljka-soft-matte-bg-reka-tuned.png",
    ],
    "zivotinja": [
        "zivotinja-soft-matte-bg-clean.png",
        "zivotinja-soft-matte-bg-static-clean-v2.png",
        "zivotinja-soft-matte-bg-reka-clean.png",
        "zivotinja-soft-matte-bg-reka-clean-v2.png",
        "zivotinja-soft-matte-bg-reka-tuned.png",
        "zivotinja-soft-matte-bg-draft.png",
        "zivotinja-source-pack/zivotinja-final-reference.png",
        "zivotinja-source-pack/zivotinja-clean-plate.png",
    ],
    "predmet": [
        "predmet-soft-matte-bg.png",
        "predmet-soft-matte-bg-reka-clean.png",
        "predmet-soft-matte-bg-reka-clean-v2.png",
        "predmet-soft-matte-bg-reka-tuned.png",
    ],
}


def rgb_to_hsv_saturation(r: int, g: int, b: int) -> float:
    r1 = r / 255.0
    g1 = g / 255.0
    b1 = b / 255.0
    mx = max(r1, g1, b1)
    mn = min(r1, g1, b1)
    if mx == 0:
        return 0.0
    return (mx - mn) / mx


def luminance(r: int, g: int, b: int) -> float:
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0


def image_stats(path: Path) -> dict:
    with Image.open(path) as img:
        rgb = img.convert("RGB")
        pixels = list(rgb.getdata())
        count = len(pixels)
        sat = sum(rgb_to_hsv_saturation(*px) for px in pixels) / count
        lum_values = [luminance(*px) for px in pixels]
        lum = sum(lum_values) / count
        lum_std = math.sqrt(sum((v - lum) ** 2 for v in lum_values) / count)
        stat = ImageStat.Stat(rgb)
        return {
            "file": str(path.relative_to(ROOT)),
            "format": img.format,
            "width": img.width,
            "height": img.height,
            "mean_saturation": round(sat, 4),
            "mean_luminance": round(lum, 4),
            "luminance_std": round(lum_std, 4),
            "mean_rgb": [round(v, 1) for v in stat.mean],
        }


def main() -> None:
    render_stats = []
    for name, path in THEME_SHOTS:
        item = image_stats(path)
        item["name"] = name
        render_stats.append(item)

    first4 = render_stats[:4]
    last3 = render_stats[4:]
    averages = {
        "first4": {
            "mean_saturation": round(sum(i["mean_saturation"] for i in first4) / len(first4), 4),
            "mean_luminance": round(sum(i["mean_luminance"] for i in first4) / len(first4), 4),
            "luminance_std": round(sum(i["luminance_std"] for i in first4) / len(first4), 4),
        },
        "last3": {
            "mean_saturation": round(sum(i["mean_saturation"] for i in last3) / len(last3), 4),
            "mean_luminance": round(sum(i["mean_luminance"] for i in last3) / len(last3), 4),
            "luminance_std": round(sum(i["luminance_std"] for i in last3) / len(last3), 4),
        },
    }

    asset_stats = {}
    for group, files in ASSET_GROUPS.items():
        rows = []
        for rel in files:
            path = ASSETS / rel
            if path.exists():
                rows.append(image_stats(path))
        asset_stats[group] = rows

    print(json.dumps(
        {
            "render_stats": render_stats,
            "averages": averages,
            "asset_stats": asset_stats,
        },
        ensure_ascii=False,
        indent=2,
    ))


if __name__ == "__main__":
    main()
