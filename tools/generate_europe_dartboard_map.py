"""Generate the stylised-but-geographically-accurate Europe dartboard map."""

from __future__ import annotations

import json
import math
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(os.environ["TEMP"]) / "countries-50m.json"
TARGET = ROOT / "www" / "assets" / "kviz-pikado-europa.svg"

# UN M49 country codes for the geographic Europe view. Kosovo is drawn with the
# same uninterrupted land treatment as Serbia: the map contains no internal
# political boundary lines.
EUROPE_COUNTRIES = {
    8, 20, 31, 40, 51, 56, 70, 100, 112, 191, 196, 203, 208, 233, 246, 250,
    268, 276, 300, 336, 348, 352, 372, 380, 398, 428, 438, 440, 442, 470,
    492, 498, 499, 528, 578, 616, 620, 642, 643, 674, 688, 703, 705, 724,
    752, 756, 792, 804, 807, 826, 383,
}

# Bounds deliberately include a small amount of sea around the continent.
MIN_LON, MAX_LON = -27.0, 60.0
MIN_LAT, MAX_LAT = 27.0, 73.0
VIEW_W, VIEW_H, PAD = 1000, 620, 28


def mercator_y(latitude: float) -> float:
    lat = max(-85.0, min(85.0, latitude))
    return -math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def project_setup() -> tuple[float, float, float]:
    min_x = math.radians(MIN_LON)
    max_x = math.radians(MAX_LON)
    min_y = mercator_y(MAX_LAT)
    max_y = mercator_y(MIN_LAT)
    scale = min((VIEW_W - 2 * PAD) / (max_x - min_x), (VIEW_H - 2 * PAD) / (max_y - min_y))
    offset_x = (VIEW_W - (max_x - min_x) * scale) / 2
    offset_y = (VIEW_H - (max_y - min_y) * scale) / 2
    return min_x, min_y, scale, offset_x, offset_y


def point_to_svg(lon: float, lat: float, setup: tuple[float, float, float, float, float]) -> tuple[float, float]:
    min_x, min_y, scale, offset_x, offset_y = setup
    return (
        offset_x + (math.radians(lon) - min_x) * scale,
        offset_y + (mercator_y(lat) - min_y) * scale,
    )


def decode_arcs(topology: dict) -> list[list[tuple[float, float]]]:
    sx, sy = topology["transform"]["scale"]
    tx, ty = topology["transform"]["translate"]
    decoded: list[list[tuple[float, float]]] = []
    for arc in topology["arcs"]:
        x = y = 0
        points: list[tuple[float, float]] = []
        for dx, dy in arc:
            x += dx
            y += dy
            points.append((tx + x * sx, ty + y * sy))
        decoded.append(points)
    return decoded


def join_ring(indices: list[int], arcs: list[list[tuple[float, float]]]) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for index in indices:
        arc = arcs[index] if index >= 0 else list(reversed(arcs[~index]))
        points.extend(arc if not points else arc[1:])
    return points


def normalize_longitudes(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Keep rings that cross the anti-meridian from drawing across Europe."""
    if not points:
        return points
    unwrapped = [points[0]]
    for longitude, latitude in points[1:]:
        previous = unwrapped[-1][0]
        while longitude - previous > 180:
            longitude -= 360
        while longitude - previous < -180:
            longitude += 360
        unwrapped.append((longitude, latitude))
    if points[0] == points[-1]:
        unwrapped[-1] = unwrapped[0]

    shifts = range(-720, 721, 360)
    shift = max(
        shifts,
        key=lambda candidate: sum(MIN_LON - 4 <= lon + candidate <= MAX_LON + 4 for lon, _ in unwrapped),
    )
    return [(longitude + shift, latitude) for longitude, latitude in unwrapped]


def geometry_polygons(geometry: dict) -> list[list[list[int]]]:
    if geometry["type"] == "Polygon":
        return [geometry["arcs"]]
    if geometry["type"] == "MultiPolygon":
        return geometry["arcs"]
    return []


def polygon_is_visible(points: list[tuple[float, float]]) -> bool:
    if not points:
        return False
    longitudes, latitudes = zip(*points)
    return not (
        max(longitudes) < MIN_LON - 4 or min(longitudes) > MAX_LON + 4
        or max(latitudes) < MIN_LAT - 4 or min(latitudes) > MAX_LAT + 4
    )


def ring_path(points: list[tuple[float, float]], setup: tuple[float, float, float, float, float]) -> str:
    projected = [point_to_svg(lon, lat, setup) for lon, lat in points]
    first_x, first_y = projected[0]
    commands = [f"M{first_x:.2f},{first_y:.2f}"]
    commands.extend(f"L{x:.2f},{y:.2f}" for x, y in projected[1:])
    commands.append("Z")
    return "".join(commands)


def build_land_path(topology: dict) -> str:
    arcs = decode_arcs(topology)
    setup = project_setup()
    country_rings_all: list[str] = []
    for geometry in topology["objects"]["countries"]["geometries"]:
        if int(geometry.get("id", -1)) not in EUROPE_COUNTRIES:
            continue
        polygons = geometry_polygons(geometry)
        country_rings: list[str] = []
        for polygon in polygons:
            outer_ring = normalize_longitudes(join_ring(polygon[0], arcs))
            if not polygon_is_visible(outer_ring):
                continue
            country_rings.append(ring_path(outer_ring, setup))
            for hole in polygon[1:]:
                country_rings.append(ring_path(normalize_longitudes(join_ring(hole, arcs)), setup))
        if country_rings:
            # One compound path makes the continent read as a single land mass.
            # The individual countries still supply accurate coastlines, but they
            # no longer restart the gradient or create visual seams between them.
            country_rings_all.extend(country_rings)
    return "".join(country_rings_all)


def main() -> None:
    topology = json.loads(SOURCE.read_text(encoding="utf-8"))
    land = build_land_path(topology)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW_W} {VIEW_H}" role="img" aria-label="Karta Evrope">
  <defs>
    <linearGradient id="sea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#315c71"/><stop offset="1" stop-color="#172d4b"/></linearGradient>
    <linearGradient id="land" gradientUnits="userSpaceOnUse" x1="250" y1="82" x2="760" y2="590"><stop offset="0" stop-color="#e3cf9d"/><stop offset=".46" stop-color="#b8b47e"/><stop offset="1" stop-color="#718d71"/></linearGradient>
    <pattern id="grid" width="100" height="62" patternUnits="userSpaceOnUse"><path d="M100 0H0V62" fill="none" stroke="#f0e5c5" stroke-opacity=".055" stroke-width="1"/></pattern>
    <filter id="land-effect" x="-10%" y="-10%" width="120%" height="120%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="expanded"/>
      <feFlood flood-color="#fff0c7" flood-opacity=".73" result="outline-color"/>
      <feComposite in="outline-color" in2="expanded" operator="in" result="outline"/>
      <feDropShadow in="SourceAlpha" dx="0" dy="9" stdDeviation="10" flood-color="#11162e" flood-opacity=".58" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="outline"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="card"><rect width="1000" height="620" rx="34"/></clipPath>
  </defs>
  <g clip-path="url(#card)">
    <rect width="1000" height="620" fill="url(#sea)"/>
    <rect width="1000" height="620" fill="url(#grid)"/>
    <g fill="url(#land)" fill-rule="evenodd" filter="url(#land-effect)" shape-rendering="geometricPrecision">
      <path d="{land}"/>
    </g>
  </g>
  <path d="M68 73h56M96 45v56" stroke="#f6e5bc" stroke-opacity=".62" stroke-width="3" stroke-linecap="round"/><path d="M96 45 85 68h22Z" fill="#e9bc76"/>
</svg>
'''
    TARGET.write_text(svg, encoding="utf-8", newline="\n")
    print(f"Generated {TARGET} as one seamless Europe land path.")


if __name__ == "__main__":
    main()
