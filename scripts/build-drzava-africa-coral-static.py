from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "www" / "assets"
FLAGS = ASSETS / "drzava-flags-gsap"

BASE_PATH = ASSETS / "drzava-static-geo-complete-v1.png"
CORAL_SHEET_PATH = (
    FLAGS / "wind-sheets-v2" / "flag-africa-coral-wind-sheet-v1.png"
)
OUTPUT_PATH = ASSETS / "drzava-static-geo-africa-coral-clean-v1.png"

FLAG_LEFT = 598
FLAG_TOP = 1016
FRAME_COUNT = 33

REGION_BOX = (585, 1000, 690, 1100)
TEXTURE_SOURCE_DY = 80

# Ručno potvrđen obris velikog plavog platna i njegove donje senke.
BLUE_CLOTH_POLYGON = (
    (620, 1028),
    (640, 1027),
    (648, 1033),
    (661, 1033),
    (672, 1028),
    (681, 1037),
    (670, 1047),
    (683, 1061),
    (667, 1064),
    (655, 1068),
    (651, 1078),
    (634, 1078),
    (621, 1065),
)

FIRST_ROUTE_BEAD_BOX = (669, 1045, 684, 1062)
POLE_PROTECTION_BOX = (606, 1018, 621, 1088)


def first_frame(sheet_path: Path) -> Image.Image:
    sheet = Image.open(sheet_path).convert("RGBA")
    if sheet.height % FRAME_COUNT:
        raise ValueError(f"Unexpected sprite-sheet height: {sheet_path}")
    frame_height = sheet.height // FRAME_COUNT
    return sheet.crop((0, 0, sheet.width, frame_height))


def local_box(global_box: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    region_left, region_top, _, _ = REGION_BOX
    left, top, right, bottom = global_box
    return (
        left - region_left,
        top - region_top,
        right - region_left,
        bottom - region_top,
    )


def main() -> None:
    base = Image.open(BASE_PATH).convert("RGBA")
    coral_frame = first_frame(CORAL_SHEET_PATH)

    region_left, region_top, region_right, region_bottom = REGION_BOX
    region = base.crop(REGION_BOX)
    region_pixels = np.asarray(region)

    hard_mask_image = Image.new("L", region.size, 0)
    polygon_local = tuple(
        (x - region_left, y - region_top) for x, y in BLUE_CLOTH_POLYGON
    )
    ImageDraw.Draw(hard_mask_image).polygon(polygon_local, fill=255)
    hard_mask_image = hard_mask_image.filter(ImageFilter.MaxFilter(5))

    bead_image = Image.new("L", region.size, 0)
    ImageDraw.Draw(bead_image).ellipse(local_box(FIRST_ROUTE_BEAD_BOX), fill=255)
    bead_mask = np.asarray(bead_image) > 0

    pole_image = Image.new("L", region.size, 0)
    ImageDraw.Draw(pole_image).rounded_rectangle(
        local_box(POLE_PROTECTION_BOX),
        radius=6,
        fill=255,
    )
    pole_mask = np.asarray(pole_image) > 0

    # Mekana organska ivica uklanja vidljiv šav; stub i kuglica su izuzeti.
    soft_mask_image = hard_mask_image.filter(ImageFilter.GaussianBlur(3))
    soft_alpha = np.asarray(soft_mask_image, dtype=np.float32) / 255.0
    soft_alpha[bead_mask | pole_mask] = 0.0

    texture_region = base.crop(
        (
            region_left,
            region_top + TEXTURE_SOURCE_DY,
            region_right,
            region_bottom + TEXTURE_SOURCE_DY,
        )
    ).convert("RGB")
    texture_rgb = np.asarray(texture_region, dtype=np.float32)
    target_rgb = region_pixels[..., :3].astype(np.float32)

    # Lokalna ravan boje koristi samo čiste okeanske piksele oko maske;
    # objekti, stub, zastavica i kuglice ne ulaze u račun.
    outer_mask = np.asarray(
        hard_mask_image.filter(ImageFilter.MaxFilter(17))
    ) > 0
    hard_mask = np.asarray(hard_mask_image) > 0
    ring = outer_mask & ~hard_mask & ~bead_mask & ~pole_mask
    target_ocean = (
        (target_rgb[..., 2] > target_rgb[..., 1] + 12)
        & (target_rgb[..., 1] > target_rgb[..., 0] + 35)
        & (target_rgb[..., 0] < 110)
    )
    colour_samples = ring & target_ocean
    if np.count_nonzero(colour_samples) < 30:
        raise RuntimeError("Not enough clean ocean samples for colour fitting")

    height, width = hard_mask.shape
    yy, xx = np.mgrid[0:height, 0:width]
    sample_design = np.column_stack(
        (
            xx[colour_samples],
            yy[colour_samples],
            np.ones(np.count_nonzero(colour_samples)),
        )
    )
    plane_design = np.column_stack(
        (xx.ravel(), yy.ravel(), np.ones(width * height))
    )
    colour_plane = np.empty_like(target_rgb)
    for channel in range(3):
        coefficients, *_ = np.linalg.lstsq(
            sample_design,
            target_rgb[..., channel][colour_samples],
            rcond=None,
        )
        colour_plane[..., channel] = (
            plane_design @ coefficients
        ).reshape(height, width)

    texture_low = np.asarray(
        texture_region.filter(ImageFilter.GaussianBlur(7)),
        dtype=np.float32,
    )
    texture_detail = texture_rgb - texture_low
    matched_texture = np.clip(colour_plane + texture_detail * 0.8, 0, 255)

    alpha = soft_alpha[..., None]
    cleaned_rgb = target_rgb * (1.0 - alpha) + matched_texture * alpha
    cleaned_pixels = region_pixels.copy()
    cleaned_pixels[..., :3] = np.clip(np.rint(cleaned_rgb), 0, 255).astype(
        np.uint8
    )

    # Vraćaju se originalna kuglica i zlatni stub tačno piksel-po-piksel.
    cleaned_pixels[bead_mask | pole_mask] = region_pixels[bead_mask | pole_mask]
    cleaned_region = Image.fromarray(cleaned_pixels, mode="RGBA")
    cleaned_region.alpha_composite(
        coral_frame,
        dest=(FLAG_LEFT - region_left, FLAG_TOP - region_top),
    )

    output = base.copy()
    output.paste(cleaned_region, (region_left, region_top))

    base_pixels = np.asarray(base)
    output_pixels = np.asarray(output)
    changed = np.any(base_pixels != output_pixels, axis=2)

    allowed = np.zeros(changed.shape, dtype=bool)
    allowed[region_top:region_bottom, region_left:region_right] = soft_alpha > 0
    coral_support = np.asarray(coral_frame.getchannel("A")) > 0
    allowed[
        FLAG_TOP : FLAG_TOP + coral_frame.height,
        FLAG_LEFT : FLAG_LEFT + coral_frame.width,
    ] |= coral_support

    protected = np.zeros(changed.shape, dtype=bool)
    protected[region_top:region_bottom, region_left:region_right] = (
        bead_mask | pole_mask
    )
    # Koralni sprite namerno prekriva samo gornji deo stuba; zato se iz zaštite
    # izuzima tačno njegova alfa-silueta, ali kuglica rute ostaje zaključana.
    protected[
        FLAG_TOP : FLAG_TOP + coral_frame.height,
        FLAG_LEFT : FLAG_LEFT + coral_frame.width,
    ] &= ~coral_support

    outside_changes = int(np.count_nonzero(changed & ~allowed))
    protected_changes = int(np.count_nonzero(changed & protected))
    if outside_changes:
        raise RuntimeError(f"Changed {outside_changes} pixels outside Africa masks")
    if protected_changes:
        raise RuntimeError(f"Changed {protected_changes} protected pixels")

    output.save(OUTPUT_PATH, optimize=True)
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Soft organic-mask pixels: {int(np.count_nonzero(soft_alpha > 0))}")
    print(f"Actually changed pixels: {int(np.count_nonzero(changed))}")
    print("Pixels changed outside Africa cloth/coral masks: 0")
    print("Protected bead/pole pixels changed outside coral alpha: 0")


if __name__ == "__main__":
    main()
