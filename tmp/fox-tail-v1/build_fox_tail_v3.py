from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[2]
ORIGINAL_PATH = ROOT / "www/assets/zivotinja-soft-matte-bg-owl-clean-v4.png"
DONOR_PATH = ROOT / "www/assets/zivotinja-soft-matte-bg-owl-fox-clean-v6.png"
OUT_DIR = ROOT / "www/assets/zivotinja-fox-animation"
TMP_DIR = ROOT / "tmp/fox-tail-v1/v3"

# All coordinates refer to the production canvas (941 x 1672).
TAIL_ROI = (10, 1028, 202, 1224)
PREVIEW_ROI = (0, 820, 340, 1260)
PIVOT = (142, 1080)


def local_points(points: list[tuple[int, int]], roi: tuple[int, int, int, int]) -> np.ndarray:
    left, top, _, _ = roi
    return np.asarray([[(x - left, y - top) for x, y in points]], dtype=np.int32)


def largest_seeded_component(mask: np.ndarray, seed: tuple[int, int]) -> np.ndarray:
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    sx, sy = seed
    label = int(labels[sy, sx])
    if label == 0 and count > 1:
        label = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return (labels == label).astype(np.uint8)


def make_tail_mask(original: Image.Image, donor: Image.Image) -> tuple[np.ndarray, np.ndarray]:
    left, top, right, bottom = TAIL_ROI
    rgb = np.asarray(original.crop(TAIL_ROI).convert("RGB"))
    donor_rgb = np.asarray(donor.crop(TAIL_ROI).convert("RGB"))
    h, w = rgb.shape[:2]

    # Conservative hand-drawn trimap. GrabCut refines it to the original silhouette.
    outer = local_points(
        [
            (145, 1042), (108, 1044), (72, 1056), (42, 1078),
            (23, 1108), (18, 1144), (25, 1175), (45, 1197),
            (76, 1211), (112, 1217), (148, 1214), (177, 1201),
            (193, 1177), (189, 1149), (171, 1127), (151, 1104),
        ],
        TAIL_ROI,
    )
    body_exclusion = local_points(
        [
            (139, 1028), (202, 1028), (202, 1161), (190, 1161),
            (181, 1145), (167, 1131), (153, 1113), (142, 1089),
        ],
        TAIL_ROI,
    )
    right_feet_exclusion = local_points(
        [(183, 1142), (202, 1142), (202, 1224), (178, 1224), (178, 1207), (184, 1182)],
        TAIL_ROI,
    )
    sure_orange = local_points(
        [
            (60, 1098), (88, 1077), (119, 1073), (134, 1085),
            (128, 1111), (110, 1145), (78, 1179), (49, 1168),
            (37, 1140), (45, 1114),
        ],
        TAIL_ROI,
    )
    sure_tip = local_points(
        [(109, 1153), (137, 1149), (163, 1161), (174, 1183), (160, 1200), (130, 1206), (105, 1190)],
        TAIL_ROI,
    )

    gc = np.full((h, w), cv2.GC_BGD, dtype=np.uint8)
    cv2.fillPoly(gc, outer, cv2.GC_PR_FGD)

    # The donor has the tail removed. Difference is useful only inside the hand trimap;
    # it must not be used globally because the image-generation donor changed other pixels.
    diff = np.max(np.abs(rgb.astype(np.int16) - donor_rgb.astype(np.int16)), axis=2)
    probable = (diff > 20) & (gc == cv2.GC_PR_FGD)
    gc[probable] = cv2.GC_PR_FGD

    cv2.fillPoly(gc, body_exclusion, cv2.GC_BGD)
    cv2.fillPoly(gc, right_feet_exclusion, cv2.GC_BGD)
    cv2.fillPoly(gc, sure_orange, cv2.GC_FGD)
    cv2.fillPoly(gc, sure_tip, cv2.GC_FGD)

    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(rgb, gc, None, bgd_model, fgd_model, 8, cv2.GC_INIT_WITH_MASK)

    binary = np.isin(gc, (cv2.GC_FGD, cv2.GC_PR_FGD)).astype(np.uint8)
    polygon_gate = np.zeros_like(binary)
    cv2.fillPoly(polygon_gate, outer, 1)
    binary &= polygon_gate
    binary = largest_seeded_component(binary, (72 - left, 1138 - top))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))

    # Sub-pixel antialiasing without changing the interior colors.
    alpha = cv2.GaussianBlur(binary.astype(np.float32), (0, 0), 0.65)
    alpha = np.clip((alpha - 0.025) / 0.95, 0.0, 1.0)
    return rgb, alpha


def decontaminated_rgba(
    source_rgb: np.ndarray, background_rgb: np.ndarray, alpha: np.ndarray
) -> np.ndarray:
    a = alpha[..., None]
    source = source_rgb.astype(np.float32)
    background = background_rgb.astype(np.float32)
    safe = np.maximum(a, 0.10)
    foreground = (source - (1.0 - a) * background) / safe
    foreground = np.clip(foreground, 0, 255)
    # The fully opaque interior remains byte-for-byte the original active background.
    foreground[a[..., 0] >= 0.995] = source[a[..., 0] >= 0.995]
    rgba = np.dstack((foreground.astype(np.uint8), np.round(alpha * 255).astype(np.uint8)))
    rgba[rgba[..., 3] == 0, :3] = 0
    return rgba


def tight_crop(rgba: np.ndarray, canvas_origin: tuple[int, int], pad: int = 3):
    ys, xs = np.where(rgba[..., 3] > 0)
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(rgba.shape[1], int(xs.max()) + 1 + pad)
    y1 = min(rgba.shape[0], int(ys.max()) + 1 + pad)
    ox, oy = canvas_origin
    return rgba[y0:y1, x0:x1], (ox + x0, oy + y0, ox + x1, oy + y1)


def make_body_occluder(original: Image.Image) -> tuple[np.ndarray, tuple[int, int, int, int]]:
    # This small exact-original patch sits above the rotating tail. Its left contour
    # follows the rump, while the lower right protects the paws. The white tip is
    # separately repeated above this patch so it can stay in front, as in the source.
    bbox = (132, 1032, 214, 1222)
    points = [
        (143, 1032), (214, 1032), (214, 1222), (177, 1222),
        (177, 1203), (183, 1182), (181, 1161), (170, 1142),
        (154, 1122), (143, 1094),
    ]
    mask = Image.new("L", (bbox[2] - bbox[0], bbox[3] - bbox[1]), 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon([(x - bbox[0], y - bbox[1]) for x, y in points], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(0.65))
    rgba = np.asarray(original.crop(bbox).convert("RGBA")).copy()
    rgba[..., 3] = np.asarray(mask)
    rgba[rgba[..., 3] == 0, :3] = 0
    return rgba, bbox


def place_on_canvas(sprite: Image.Image, bbox: tuple[int, int, int, int], size: tuple[int, int]) -> Image.Image:
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(sprite, (bbox[0], bbox[1]))
    return canvas


def rotated_full_layer(layer: Image.Image, angle: float, pivot: tuple[int, int]) -> Image.Image:
    arr = np.asarray(layer)
    matrix = cv2.getRotationMatrix2D(pivot, angle, 1.0)
    warped = cv2.warpAffine(
        arr,
        matrix,
        layer.size,
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0, 0),
    )
    return Image.fromarray(warped, mode="RGBA")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)

    original = Image.open(ORIGINAL_PATH).convert("RGBA")
    donor = Image.open(DONOR_PATH).convert("RGBA")
    if original.size != (941, 1672) or donor.size != original.size:
        raise ValueError(f"Unexpected canvas sizes: {original.size=} {donor.size=}")

    tail_rgb, tail_alpha = make_tail_mask(original, donor)
    donor_rgb = np.asarray(donor.crop(TAIL_ROI).convert("RGB"))
    tail_rgba = decontaminated_rgba(tail_rgb, donor_rgb, tail_alpha)
    tail_tight, tail_bbox = tight_crop(tail_rgba, TAIL_ROI[:2])
    tail_image = Image.fromarray(tail_tight, mode="RGBA")
    tail_image.save(OUT_DIR / "fox-tail-original-v3.png")

    # Exact original white tip, isolated from the already-matted original tail.
    hsv = cv2.cvtColor(tail_tight[..., :3], cv2.COLOR_RGB2HSV)
    tip_gate = (hsv[..., 1] < 100) & (hsv[..., 2] > 135) & (tail_tight[..., 3] > 0)
    tip_gate = cv2.morphologyEx(tip_gate.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    tip_alpha = np.minimum(
        tail_tight[..., 3],
        cv2.GaussianBlur((tip_gate * 255).astype(np.uint8), (0, 0), 0.55),
    )
    tip_rgba = tail_tight.copy()
    tip_rgba[..., 3] = tip_alpha
    tip_rgba[tip_rgba[..., 3] == 0, :3] = 0
    Image.fromarray(tip_rgba, mode="RGBA").save(OUT_DIR / "fox-tail-tip-original-v3.png")

    body_rgba, body_bbox = make_body_occluder(original)
    body_image = Image.fromarray(body_rgba, mode="RGBA")
    body_image.save(OUT_DIR / "fox-body-occluder-original-v3.png")

    # Replace only the exact tail footprint; every other source pixel remains intact.
    clean = original.copy()
    cleanup_mask = Image.fromarray(np.round(tail_alpha * 255).astype(np.uint8), mode="L")
    cleanup_mask = cleanup_mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.0))
    clean_region = Image.composite(donor.crop(TAIL_ROI), original.crop(TAIL_ROI), cleanup_mask)
    clean.paste(clean_region, TAIL_ROI[:2])
    clean.save(OUT_DIR / "zivotinja-bg-fox-tail-clean-original-v3.png")

    # Full-canvas versions are used only for deterministic preview composition.
    tail_full = place_on_canvas(tail_image, tail_bbox, original.size)
    tip_full = place_on_canvas(Image.fromarray(tip_rgba, mode="RGBA"), tail_bbox, original.size)
    body_full = place_on_canvas(body_image, body_bbox, original.size)

    panels = []
    for label, angle in (("ORIGINAL", None), ("MIRNO 0°", 0.0), ("MAŠE -4°", -4.0), ("MAŠE -7°", -7.0)):
        if angle is None:
            frame = original.copy()
        else:
            frame = clean.copy()
            frame.alpha_composite(rotated_full_layer(tail_full, angle, PIVOT))
            frame.alpha_composite(body_full)
            frame.alpha_composite(rotated_full_layer(tip_full, angle, PIVOT))
        panel = frame.crop(PREVIEW_ROI)
        panel_h = panel.height + 32
        labelled = Image.new("RGB", (panel.width, panel_h), "#17212a")
        labelled.paste(panel.convert("RGB"), (0, 0))
        ImageDraw.Draw(labelled).text((10, panel.height + 9), label, fill="white")
        panels.append(labelled)

    sheet = Image.new("RGB", (sum(p.width for p in panels), max(p.height for p in panels)), "#17212a")
    x = 0
    for panel in panels:
        sheet.paste(panel, (x, 0))
        x += panel.width
    sheet.save(TMP_DIR / "fox-tail-original-v3-contact.jpg", quality=95, subsampling=0)

    transform_origin = (
        100.0 * (PIVOT[0] - tail_bbox[0]) / (tail_bbox[2] - tail_bbox[0]),
        100.0 * (PIVOT[1] - tail_bbox[1]) / (tail_bbox[3] - tail_bbox[1]),
    )
    print(f"tail_bbox={tail_bbox}")
    print(f"body_bbox={body_bbox}")
    print(f"pivot={PIVOT}")
    print(f"transform_origin_pct=({transform_origin[0]:.3f}%, {transform_origin[1]:.3f}%)")
    print(f"contact={TMP_DIR / 'fox-tail-original-v3-contact.jpg'}")


if __name__ == "__main__":
    main()
