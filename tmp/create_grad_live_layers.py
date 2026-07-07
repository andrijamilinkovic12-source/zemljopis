from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "www" / "assets" / "grad-soft-matte-bg.png"
CLEAN_OUT = ROOT / "www" / "assets" / "grad-soft-matte-bg-clean.png"
CLOUDS_OUT = ROOT / "www" / "assets" / "grad-clouds-layer.png"


def build_cloud_mask(img: Image.Image) -> Image.Image:
    mask = Image.new("L", img.size, 0)
    draw = ImageDraw.Draw(mask)

    # Left lower cloud.
    draw.ellipse((-18, 246, 112, 326), fill=255)
    draw.ellipse((38, 214, 124, 306), fill=255)
    draw.ellipse((94, 244, 188, 322), fill=255)
    draw.ellipse((12, 270, 158, 336), fill=255)

    # Upper-left cloud.
    draw.ellipse((168, 138, 242, 196), fill=255)
    draw.ellipse((206, 104, 302, 196), fill=255)
    draw.ellipse((264, 92, 344, 202), fill=255)
    draw.ellipse((318, 132, 384, 200), fill=255)
    draw.ellipse((206, 160, 364, 214), fill=255)

    # Large upper-right cloud.
    draw.ellipse((504, 152, 602, 234), fill=255)
    draw.ellipse((548, 112, 676, 238), fill=255)
    draw.ellipse((632, 84, 744, 244), fill=255)
    draw.ellipse((704, 132, 806, 226), fill=255)
    draw.ellipse((560, 178, 774, 256), fill=255)

    # Small right cloud.
    draw.ellipse((800, 190, 872, 242), fill=255)
    draw.ellipse((842, 166, 906, 236), fill=255)
    draw.ellipse((892, 190, 946, 234), fill=255)
    draw.ellipse((826, 206, 928, 252), fill=255)

    return mask.filter(ImageFilter.GaussianBlur(3.5))


def clean_cloud_patch_mask(size: tuple[int, int]) -> Image.Image:
    patch = build_cloud_mask(Image.new("RGB", size, (0, 0, 0)))
    patch = patch.filter(ImageFilter.MaxFilter(25)).filter(ImageFilter.GaussianBlur(9))
    return patch.point(lambda a: 0 if a < 10 else a)


def clean_cloud_patch_core(size: tuple[int, int]) -> Image.Image:
    patch = build_cloud_mask(Image.new("RGB", size, (0, 0, 0)))
    patch = patch.filter(ImageFilter.MaxFilter(27))
    return patch.point(lambda a: 255 if a > 8 else 0)


def row_gradient_fill(img: Image.Image, cloud_mask: Image.Image) -> Image.Image:
    rgb = np.asarray(img.convert("RGB")).astype(np.uint8)
    h, w, _ = rgb.shape

    gradient = np.zeros_like(rgb)
    fallback = np.array([116, 194, 233], dtype=np.float32)
    for yy in range(h):
        if yy < 380:
            row = rgb[yy].astype(np.int16)
            # Prefer true sky samples; puffy clouds have much warmer red/green values.
            sky = (row[:, 2] > row[:, 0] + 18) & (row[:, 2] > row[:, 1] - 4)
            available = rgb[yy][sky]
            if len(available) > 20:
                color = np.percentile(available, 42, axis=0)
                fallback = fallback * 0.9 + color * 0.1
            else:
                color = fallback
            gradient[yy, :, :] = np.clip(color, 0, 255)
        else:
            gradient[yy, :, :] = rgb[yy]

    grad_img = Image.fromarray(gradient, "RGB").filter(ImageFilter.GaussianBlur((5, 8)))

    original = img.convert("RGBA")
    sky_alpha = Image.new("L", img.size, 0)
    alpha_np = np.zeros((h, w), dtype=np.uint8)
    alpha_np[:350, :] = 255
    for yy in range(350, min(392, h)):
        alpha_np[yy, :] = int(255 * (1 - ((yy - 350) / 42)))
    sky_alpha = Image.fromarray(alpha_np, "L").filter(ImageFilter.GaussianBlur(2.4))

    return Image.composite(grad_img.convert("RGBA"), original, sky_alpha).convert("RGB")


def main() -> None:
    img = Image.open(SRC).convert("RGB")
    cloud_alpha = build_cloud_mask(img)

    clouds = img.convert("RGBA")
    clouds.putalpha(cloud_alpha)
    clouds.save(CLOUDS_OUT, optimize=True)

    clean = row_gradient_fill(img, cloud_alpha)
    clean.save(CLEAN_OUT, optimize=True)

    print(f"saved {CLEAN_OUT.relative_to(ROOT)} {clean.size}")
    print(f"saved {CLOUDS_OUT.relative_to(ROOT)} {clouds.size}")


if __name__ == "__main__":
    main()
