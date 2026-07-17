from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "www" / "assets"
FLAGS = ASSETS / "drzava-flags-gsap"

BASE_PATH = ASSETS / "drzava-static-geo-complete-v1.png"
FILL_PATH = ASSETS / "drzava-static-geo-flags-open-v10.png"
OPEN_OUTPUT_PATH = ASSETS / "drzava-static-geo-flags-open-v12.png"
STATIC_OUTPUT_PATH = ASSETS / "drzava-static-geo-coral-v5.png"

# Pozicije i dimenzije su iste kao CSS promenljive u www/index.html.
FLAG_SHEETS = (
    (95, 497, FLAGS / "wind-sheets-v1" / "flag-na-wind-sheet-v1.png", FLAGS / "wind-sheets-v1" / "flag-na-wind-sheet-v1.png", 5),
    (597, 411, FLAGS / "wind-sheets-v1" / "flag-eu-wind-sheet-v1.png", FLAGS / "wind-sheets-v1" / "flag-eu-wind-sheet-v1.png", 5),
    (743, 540, FLAGS / "wind-sheets-v1" / "flag-asia_n-wind-sheet-v1.png", FLAGS / "wind-sheets-v1" / "flag-asia_n-wind-sheet-v1.png", 5),
    (662, 694, FLAGS / "wind-sheets-v1" / "flag-asia-wind-sheet-v1.png", FLAGS / "wind-sheets-v1" / "flag-asia-wind-sheet-v1.png", 5),
    (255, 917, FLAGS / "wind-sheets-v1" / "flag-sa-wind-sheet-v1.png", FLAGS / "wind-sheets-v1" / "flag-sa-wind-sheet-v1.png", 5),
    # Originalna podloga ima plavu afričku zastavu. Njena v1 maska je
    # geometrijski tačna; v2 koralna animacija ostaje aktivni prikaz u aplikaciji.
    (
        598,
        1016,
        FLAGS / "wind-sheets-v1" / "flag-africa-wind-sheet-v1.png",
        FLAGS / "wind-sheets-v2" / "flag-africa-coral-wind-sheet-v1.png",
        1,
    ),
)


def main() -> None:
    base = Image.open(BASE_PATH).convert("RGBA")
    fill = Image.open(FILL_PATH).convert("RGBA")

    if base.size != fill.size:
        raise ValueError(f"Background sizes differ: {base.size} != {fill.size}")

    output = base.copy()
    changed_mask = Image.new("1", base.size, 0)

    for left, top, sheet_path, _display_sheet_path, mask_filter_size in FLAG_SHEETS:
        sheet = Image.open(sheet_path).convert("RGBA")
        if sheet.height % 33:
            raise ValueError(f"Unexpected sprite-sheet height: {sheet_path}")

        frame_height = sheet.height // 33
        # Unija svih kadrova uklanja celu statičnu zastavicu i njene rubove,
        # ali ne zahvata pravougaoni prostor oko nje.
        alpha_union = Image.new("L", (sheet.width, frame_height), 0)
        for frame_index in range(33):
            frame_top = frame_index * frame_height
            frame = sheet.crop((0, frame_top, sheet.width, frame_top + frame_height))
            alpha_union = ImageChops.lighter(alpha_union, frame.getchannel("A"))

        alpha_union = alpha_union.point(lambda value: 255 if value else 0)
        if mask_filter_size > 1:
            alpha_union = alpha_union.filter(ImageFilter.MaxFilter(mask_filter_size))

        if sheet_path.name == "flag-africa-wind-sheet-v1.png":
            # Originalna plava zastava i njen donji senčeni rub nisu potpuno
            # obuhvaćeni animacionom alfom. Uzimamo samo stvarno izmenjene
            # piksele levo od prve okeanske kuglice (globalni x=670).
            region_box = (left, top, left + sheet.width, top + frame_height)
            base_region = base.crop(region_box).convert("RGB")
            fill_region_rgb = fill.crop(region_box).convert("RGB")
            difference = ImageChops.difference(base_region, fill_region_rgb)
            red, green, blue = difference.split()
            difference_max = ImageChops.lighter(ImageChops.lighter(red, green), blue)
            difference_mask = difference_max.point(lambda value: 255 if value > 4 else 0)
            protected_route_mask = Image.new("L", difference_mask.size, 0)
            route_start_x = 670 - left
            protected_route_mask.paste(
                difference_mask.crop((0, 0, route_start_x, frame_height)),
                (0, 0),
            )
            alpha_union = ImageChops.lighter(alpha_union, protected_route_mask)

        exact_mask = alpha_union.convert("1")
        fill_region = fill.crop((left, top, left + sheet.width, top + frame_height))
        output.paste(fill_region, (left, top), exact_mask)
        changed_mask.paste(exact_mask, (left, top))

    output.save(OPEN_OUTPUT_PATH, optimize=True)

    # Dodatni ekrani nemaju GSAP sloj, pa dobijaju statičan prvi kadar
    # istih zastavica preko iste ispravljene osnove.
    static_output = output.copy()
    for left, top, _mask_sheet_path, display_sheet_path, _mask_filter_size in FLAG_SHEETS:
        display_sheet = Image.open(display_sheet_path).convert("RGBA")
        frame_height = display_sheet.height // 33
        first_frame = display_sheet.crop((0, 0, display_sheet.width, frame_height))
        static_output.alpha_composite(first_frame, dest=(left, top))
    static_output.save(STATIC_OUTPUT_PATH, optimize=True)

    # Garantuje da nijedan piksel van silueta zastavica nije promenjen.
    base_pixels = base.load()
    output_pixels = output.load()
    mask_pixels = changed_mask.load()
    outside_changes = 0
    for y in range(base.height):
        for x in range(base.width):
            if not mask_pixels[x, y] and base_pixels[x, y] != output_pixels[x, y]:
                outside_changes += 1

    if outside_changes:
        raise RuntimeError(f"Changed {outside_changes} pixels outside flag masks")

    print(f"Wrote {OPEN_OUTPUT_PATH}")
    print(f"Wrote {STATIC_OUTPUT_PATH}")
    masked_pixels = sum(1 for value in changed_mask.get_flattened_data() if value)
    print(f"Masked pixels: {masked_pixels}")
    print("Pixels changed outside masks: 0")


if __name__ == "__main__":
    main()
