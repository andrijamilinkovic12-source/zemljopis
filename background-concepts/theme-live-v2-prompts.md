# ZEMLJOPIS: seven live backgrounds

Generated with the built-in imagegen tool on 9 November 2026. Each PNG is a complete still scene. On 10 November, matching animated PNG files (`*-live.png`, APNG format) replaced the SVG/CSS motion layer. The first frame is the complete still scene; later frames contain raster movement.

## Shared prompt for Reka, Grad, Planina, Biljka, Životinja and Predmet

> Use case: stylized-concept. Asset type: portrait mobile game background for ZEMLJOPIS, {theme} theme. Create a brand new scene, not a copy of existing background. {scene} Match a cohesive series of premium children's geography game art: soft matte hand-sculpted clay 3D, rounded tactile forms, refined pastel palette of turquoise, green, coral, gold and lavender, gentle studio light, polished depth. Vertical 9:16 composition, central 35% low visual density so game controls remain readable, more detail at edges and lower corners. This complete still frame is the exact base image for a live animated overlay. No text, no letters, no UI, no logo, no watermark.

The Reka, Grad and Planina prompts also specify a soft sky in the upper quarter.

## Scene prompts

- **Država** (`drzava.png`): Magical hand-sculpted clay world atlas landscape, a large curved globe/map surface made of colorful raised clay continents across the lower two thirds, small clay location pins, a golden compass near the bottom, blue sky above. Open center for game UI.
- **Reka** (`okean.png`, internal theme key `okean`): Winding sapphire river from green hills toward the viewer, grassy banks, cattails, pebbles, lily pads and warm sunset sky. Calm open water in the center.
- **Grad** (`grad.png`): Miniature clay town with colorful houses, domes, trees, arched bridge, glowing windows and a small fountain low in the frame. Buildings frame a quiet central square.
- **Planina** (`planina.png`): Rounded blue, lavender and terracotta mountains with white snowcaps, green valley, conifers, sandy trail and clear dawn sky. Quiet central valley.
- **Biljka** (`biljka.png`): Sunlit botanical garden with wooden greenhouse arch, side vines and flower pots, seedlings and flowers in the lower corners, open sandy path through the center.
- **Životinja** (`zivotinja.png`): Friendly forest clearing with complete clay fox, hedgehog, deer, rabbit, owl and perched birds. Open meadow and winding path in the center.
- **Predmet** (`predmet.png`): Cozy study with wooden shelves, books, desk lamp, magnifying glass, pencil cup, globe and geometric blocks at the edges. Uncluttered center.

All seven prompts specify no text, logo, interface or watermark.

## Live PNG sprites and build

The transparent sprite PNGs in `theme-live-v2-sprites/` were generated on 10 November 2026 with these prompts:

- `plane.png`: A single tiny friendly hand-sculpted clay toy airplane in warm cream and coral, viewed from above at a three-quarter angle, soft matte texture, transparent background, no text or shadow rectangle.
- `boat.png`: A single miniature hand-sculpted clay sailboat with coral hull and cream sail, soft matte finish, seen from a gentle elevated angle, transparent background, no text.
- `butterfly.png`: A single delicate pastel clay butterfly with rounded lavender and peach wings, soft sculpted texture, transparent background, no text.
- `cloud.png`: A single small fluffy pastel cream clay cloud, rounded studio-lit form, isolated on transparent background, no text.

`scripts/build-theme-live-frames.ps1` rasterizes 24 transparent frames for each scene. It moves the plane across the atlas, boat along the river, clouds across the town and mountains, butterfly through the garden and forest, and lamp glow/plane around the study globe. `scripts/build-theme-live-apng.py` packages each still plus those frames into an animated PNG with a `.png` extension. Build with:

```powershell
./scripts/build-theme-live-frames.ps1 -FrameCount 24
python scripts/build-theme-live-apng.py --frames 24 --duration-ms 125
```
