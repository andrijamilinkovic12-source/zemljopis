from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "www" / "assets"

BASE_PATH = ASSETS / "drzava-static-geo-complete-v1.png"
MASK_REFERENCE_PATH = ASSETS / "drzava-static-geo-flags-open-v10.png"
OUTPUT_PATH = ASSETS / "drzava-static-geo-africa-coral-clean-v2.png"

REGION_BOX = (585, 1000, 690, 1100)
DIFFERENCE_THRESHOLD = 20

# Ograničava izbor boje na stvarno plavo platno i njegovu antialiasing ivicu.
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

CORAL_HUE = 6
CORAL_SATURATION_SCALE = 1.08
CORAL_VALUE_SCALE = 1.02


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
    mask_reference = Image.open(MASK_REFERENCE_PATH).convert("RGBA")
    if base.size != mask_reference.size:
        raise ValueError("Base and mask-reference images must have equal dimensions")

    region_left, region_top, region_right, region_bottom = REGION_BOX
    region = base.crop(REGION_BOX)
    reference_region = mask_reference.crop(REGION_BOX)
    region_pixels = np.asarray(region)
    reference_pixels = np.asarray(reference_region)

    polygon_image = Image.new("L", region.size, 0)
    polygon_local = tuple(
        (x - region_left, y - region_top) for x, y in BLUE_CLOTH_POLYGON
    )
    ImageDraw.Draw(polygon_image).polygon(polygon_local, fill=255)
    polygon_mask = np.asarray(polygon_image) > 0

    difference = np.max(
        np.abs(
            region_pixels[..., :3].astype(np.int16)
            - reference_pixels[..., :3].astype(np.int16)
        ),
        axis=2,
    )
    rgb = region_pixels[..., :3]
    hsv_image = region.convert("RGB").convert("HSV")
    hsv = np.asarray(hsv_image).copy()

    blue_colour = (
        (hsv[..., 0] >= 110)
        & (hsv[..., 0] <= 175)
        & (rgb[..., 0] > 70)
    )
    raw_mask = polygon_mask & (difference > DIFFERENCE_THRESHOLD) & blue_colour

    # Zatvara samo sitne rupe unutar platna; završni presek sa blue_colour
    # garantuje da nijedan piksel okeana ne može da bude prebojen.
    raw_mask_image = Image.fromarray((raw_mask * 255).astype(np.uint8), mode="L")
    closed_mask = np.asarray(
        raw_mask_image.filter(ImageFilter.MaxFilter(3)).filter(
            ImageFilter.MinFilter(3)
        )
    ) > 0
    recolour_mask = (raw_mask | closed_mask) & blue_colour & polygon_mask

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

    recolour_mask &= ~(bead_mask | pole_mask)

    recoloured_hsv = hsv.copy()
    recoloured_hsv[..., 0][recolour_mask] = CORAL_HUE
    recoloured_hsv[..., 1][recolour_mask] = np.clip(
        np.rint(
            hsv[..., 1][recolour_mask].astype(np.float32)
            * CORAL_SATURATION_SCALE
        ),
        0,
        255,
    ).astype(np.uint8)
    recoloured_hsv[..., 2][recolour_mask] = np.clip(
        np.rint(
            hsv[..., 2][recolour_mask].astype(np.float32) * CORAL_VALUE_SCALE
        ),
        0,
        255,
    ).astype(np.uint8)

    recoloured_rgb = np.asarray(
        Image.fromarray(recoloured_hsv, mode="HSV").convert("RGB")
    )
    output_region_pixels = region_pixels.copy()
    output_region_pixels[..., :3][recolour_mask] = recoloured_rgb[recolour_mask]

    output = base.copy()
    output.paste(
        Image.fromarray(output_region_pixels, mode="RGBA"),
        (region_left, region_top),
    )

    base_pixels = np.asarray(base)
    output_pixels = np.asarray(output)
    changed = np.any(base_pixels != output_pixels, axis=2)

    allowed = np.zeros(changed.shape, dtype=bool)
    allowed[region_top:region_bottom, region_left:region_right] = recolour_mask
    protected = np.zeros(changed.shape, dtype=bool)
    protected[region_top:region_bottom, region_left:region_right] = (
        bead_mask | pole_mask
    )

    outside_changes = int(np.count_nonzero(changed & ~allowed))
    protected_changes = int(np.count_nonzero(changed & protected))
    ocean_changes = int(np.count_nonzero(changed & ~allowed))
    if outside_changes:
        raise RuntimeError(f"Changed {outside_changes} pixels outside blue cloth")
    if protected_changes:
        raise RuntimeError(f"Changed {protected_changes} protected pixels")

    output.save(OUTPUT_PATH, optimize=True)
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Recoloured blue-cloth pixels: {int(np.count_nonzero(recolour_mask))}")
    print(f"Actually changed pixels: {int(np.count_nonzero(changed))}")
    print(f"Ocean/background pixels changed: {ocean_changes}")
    print("Protected route/pole pixels changed: 0")


if __name__ == "__main__":
    main()
