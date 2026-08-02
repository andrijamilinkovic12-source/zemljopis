from pathlib import Path

import numpy as np
from PIL import Image

source = Image.open("tmp/un-no-text-hi-1.png").convert("RGB")
# Exact geographic frame inside the UN sheet: excludes header, legend, and footer.
geographic = source.crop((416, 476, 5020, 3162)).resize((4096, 2390), Image.Resampling.LANCZOS)
pixels = np.asarray(geographic).copy()
r, g, b = pixels[..., 0], pixels[..., 1], pixels[..., 2]

# Preserve geometry and border pixels from the UN rendering; replace only its paper palette.
water = (r > 205) & (g > 222) & (b > 228) & ((b - r) > 5)
land = (r > 236) & (g > 236) & (b > 236)
coast = (b > r + 20) & (b > g + 5) & (b > 155) & ~water
border = ~(water | land | coast)

pixels[water] = (4, 32, 83)
pixels[land] = (40, 111, 174)
pixels[coast] = (126, 201, 239)
pixels[border] = (127, 178, 217)

# Full-opacity raster, designed for smooth pinch-zoom in the existing SVG viewport.
Image.fromarray(pixels, "RGB").save("www/assets/put-oko-sveta-un-bez-teksta-v3.png", optimize=True)
