"""Bake the clay airplane turntable to PNG. The app only draws the finished poses."""
from pathlib import Path

import numpy as np
from PIL import Image


TILE = (160, 112)
POSES = 128
ROTOR_PHASES = 12  # Three identical blades repeat after 120 degrees.
ROTOR_TILE = 40
CORAL = (232, 113, 93)
CREAM = (246, 224, 184)
GOLD = (233, 177, 82)
TEAL = (54, 146, 149)


def rotation(yaw=0, pitch=0, roll=0):
    y, p, r = np.radians([yaw, pitch, roll])
    cy, cp, cr = np.cos([y, p, r])
    sy, sp, sr = np.sin([y, p, r])
    return (np.array([[cy, -sy, 0], [sy, cy, 0], [0, 0, 1]]) @
            np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]]) @
            np.array([[cr, 0, sr], [0, 1, 0], [-sr, 0, cr]]))


# Local axes are wingtip, nose and up. All parts rotate around one fixed pivot.
parts = []


def part(center, radii, color, orientation=None, material=None):
    axes = np.eye(3) if orientation is None else orientation
    parts.append((np.array(center), axes @ np.diag(1 / np.array(radii)), color, material))


part((0, -.08, .02), (.38, 1.36, .38), CREAM, material="hull")
part((0, .94, .02), (.355, .44, .345), CORAL)
part((0, .19, .28), (.302, .49, .28), TEAL, material="glass")
for side in (-1, 1):
    part((side*.84, -.03, -.075), (.91, .325, .093), CORAL, rotation(yaw=side*6, roll=-side*3))
    part((side*.33, -1.08, .10), (.50, .212, .065), CORAL, rotation(yaw=side*10))
part((0, -1.04, .31), (.084, .30, .45), CREAM, rotation(pitch=20), "fin")
hub = np.array([0, 1.38, .02])
part(hub, (.135, .123, .135), GOLD)


def render(index, rotor_phase=None):
    w, h = TILE
    # Fixed elevated camera, with lighting anchored in the scene.
    elev = np.radians(44)
    az = rotation(yaw=-index*360/POSES)
    right = np.array([1, 0, 0]) @ az.T
    down = np.array([0, np.sin(elev), -np.cos(elev)]) @ az.T
    eye = np.array([0, np.cos(elev), np.sin(elev)]) @ az.T
    geometry = parts.copy()
    if rotor_phase is None:
        patch_w, patch_h = w, h
        left = top = 0
    else:
        # Use the same camera and depth test as the hull so rear views hide the blades.
        patch_w = patch_h = ROTOR_TILE
        left = int(np.floor(w/2 + 35.5*(hub @ right) + .5)) - patch_w//2
        top = int(np.floor(h/2 + 35.5*(hub @ down) + .5)) - patch_h//2
        for blade in range(3):
            spin = rotation(roll=24 + blade*120 + rotor_phase*120/ROTOR_PHASES)
            geometry.append((hub + spin @ np.array([0, 0, .215]),
                             spin @ np.diag(1/np.array([.083, .047, .24])), GOLD, None))
    yy, xx = np.mgrid[:2*patch_h, :2*patch_w]
    x = (xx+2*left+.5-w) / 71
    y = (yy+2*top+.5-h) / 71
    light = -.42*right - .65*down + .63*eye
    origin = x[..., None]*right + y[..., None]*down
    depth = np.full(x.shape, -np.inf)
    colors = np.zeros((*x.shape, 4), dtype=np.uint8)
    for part_index, (center, inv_axes, base, material) in enumerate(geometry):
        local = (origin-center) @ inv_axes
        ray = eye @ inv_axes
        a = ray @ ray
        b = local @ ray
        disc = b*b - a*((local*local).sum(axis=2)-1)
        t = (-b + np.sqrt(np.maximum(0, disc))) / a
        visible = (disc > 0) & (t > depth)
        if not np.any(visible):
            continue
        depth[visible] = t[visible]
        if rotor_phase is not None and part_index < len(parts):
            continue
        surface = local[visible] + t[visible, None]*ray
        normal = surface @ inv_axes.T
        normal /= np.linalg.norm(normal, axis=1)[:, None]
        pigment = np.tile(base, (len(normal), 1))
        if material == "fin":
            pigment[(surface[:, 2] > .27) & (surface[:, 2] < .54)] = (58, 104, 131)
        if material == "glass":
            pigment[np.abs(surface[:, 1]+.09) < .045] = (94, 166, 161)
        if material == "hull":
            pigment[(surface[:, 1] > .56) & (surface[:, 1] < .60)] = GOLD
        diffuse = np.maximum(0, normal @ light)
        # Soft contact shadows anchor the wing roots, cockpit and propeller.
        hit = origin[visible] + t[visible, None]*eye + .008*normal
        shade = np.zeros(len(hit))
        for other_index, (other_center, other_axes, _, _) in enumerate(geometry):
            if other_index == part_index:
                continue
            v = (hit - other_center) @ other_axes
            sun = light @ other_axes
            distance = -(v @ sun) / (sun @ sun)
            closest = np.linalg.norm(v + distance[:, None]*sun, axis=1)
            cover = np.clip((1.16 - closest)/.34, 0, 1) * np.clip(distance/.05, 0, 1)
            shade = np.maximum(shade, cover)
        half = (light+eye) / np.linalg.norm(light+eye)
        sheen = 12 * np.maximum(0, normal @ half)**9
        grain = 1.35*np.sin(surface[:, 0]*92 + surface[:, 2]*48)*np.sin(surface[:, 1]*112)
        rgb = pigment*(.67+.35*diffuse[:, None])*(1-.18*shade[:, None]) + (sheen+grain)[:, None]
        colors[visible, :3] = np.clip(rgb, 0, 255)
        colors[visible, 3] = 255
    return Image.fromarray(colors).resize((patch_w, patch_h), Image.Resampling.LANCZOS)


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    atlas = Image.new("RGBA", (8*TILE[0], 16*TILE[1]))
    rotor = Image.new("RGBA", (32*ROTOR_TILE, 48*ROTOR_TILE))
    for index in range(POSES):
        atlas.paste(render(index), ((index%8)*TILE[0], (index//8)*TILE[1]))
        for phase in range(ROTOR_PHASES):
            cell = index*ROTOR_PHASES + phase
            rotor.paste(render(index, phase), ((cell%32)*ROTOR_TILE, (cell//32)*ROTOR_TILE))
    dest = root / "www/assets/theme-live-v3/drzava-sprites"
    atlas.save(dest / "plane-atlas.png")
    rotor.save(dest / "plane-rotor.png")
