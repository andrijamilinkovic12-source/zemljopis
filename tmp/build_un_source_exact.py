from PIL import Image
import numpy as np

source = Image.open(r"C:\Users\andri\Downloads\world_map_4651_r4_jul26.jpg").convert("RGB")
# Geographic panel only. Nothing inside this rectangle is redrawn or geometrically edited.
panel = source.crop((1040, 1190, 12550, 7000)).resize((4096, 2068), Image.Resampling.LANCZOS)
pixels = np.asarray(panel).copy()
r, g, b = pixels[..., 0], pixels[..., 1], pixels[..., 2]

# The UN sea tint is pale blue. Replace that flat palette only; country fills,
# coastlines, international boundaries, labels and all their pixels are retained.
sea = (r >= 205) & (g >= 222) & (b >= 228) & ((b.astype(np.int16) - r.astype(np.int16)) >= 5)
pixels[sea] = (4, 32, 83)

Image.fromarray(pixels, "RGB").save(
    "www/assets/put-oko-sveta-un-izvorne-granice-tamno-plavo-v2.png",
    optimize=True,
)
