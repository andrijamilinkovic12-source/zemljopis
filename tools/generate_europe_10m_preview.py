"""Create the high-detail, label-free Europe map prototype for Pikado."""

from __future__ import annotations

import json
import math
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(os.environ["TEMP"]) / "ne_10m_admin_0_countries.geojson"
TARGET = ROOT / "www" / "assets" / "kviz-pikado-europa-natural-10m-preview.svg"

MIN_LON, MAX_LON = -27.0, 58.0
MIN_LAT, MAX_LAT = 27.0, 73.0
WIDTH, HEIGHT, PAD = 1000, 620, 34
TOLERANCE = 0.55  # screen pixels; keeps the coastline precise but mobile-friendly


def normalize_longitudes(points: list[list[float]]) -> list[tuple[float, float]]:
    if not points:
        return []
    wrapped = [(float(points[0][0]), float(points[0][1]))]
    for raw_lon, raw_lat in points[1:]:
        lon = float(raw_lon)
        lat = float(raw_lat)
        previous = wrapped[-1][0]
        while lon - previous > 180:
            lon -= 360
        while lon - previous < -180:
            lon += 360
        wrapped.append((lon, lat))
    if points[0] == points[-1]:
        wrapped[-1] = wrapped[0]
    shift = max(
        range(-720, 721, 360),
        key=lambda candidate: sum(MIN_LON - 4 <= lon + candidate <= MAX_LON + 4 for lon, _ in wrapped),
    )
    return [(lon + shift, lat) for lon, lat in wrapped]


def has_visible_point(points: list[tuple[float, float]]) -> bool:
    return any(MIN_LON - 3 <= lon <= MAX_LON + 3 and MIN_LAT - 3 <= lat <= MAX_LAT + 3 for lon, lat in points)


def clip_ring(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Clip large transcontinental polygons to the Europe composition window."""
    if len(points) < 4:
        return []
    clipped = points[:-1] if points[0] == points[-1] else points[:]

    def clip_edge(vertices, axis, boundary, keep_greater):
        if not vertices:
            return []
        result = []
        previous = vertices[-1]
        previous_inside = previous[axis] >= boundary if keep_greater else previous[axis] <= boundary
        for current in vertices:
            current_inside = current[axis] >= boundary if keep_greater else current[axis] <= boundary
            if current_inside != previous_inside:
                delta = current[axis] - previous[axis]
                if delta:
                    ratio = (boundary - previous[axis]) / delta
                    result.append((
                        previous[0] + ratio * (current[0] - previous[0]),
                        previous[1] + ratio * (current[1] - previous[1]),
                    ))
            if current_inside:
                result.append(current)
            previous, previous_inside = current, current_inside
        return result

    for axis, boundary, keep_greater in ((0, MIN_LON, True), (0, MAX_LON, False), (1, MIN_LAT, True), (1, MAX_LAT, False)):
        clipped = clip_edge(clipped, axis, boundary, keep_greater)
    return clipped + [clipped[0]] if len(clipped) >= 3 else []


def lcc_raw(lon: float, lat: float) -> tuple[float, float]:
    # Lambert conformal conic: familiar-looking Europe without Mercator's northward stretch.
    phi1, phi2, phi0, lam0 = map(math.radians, (35.0, 65.0, 50.0, 12.0))
    phi = math.radians(max(-85.0, min(85.0, lat)))
    lam = math.radians(lon)
    n = math.log(math.cos(phi1) / math.cos(phi2)) / math.log(
        math.tan(math.pi / 4 + phi2 / 2) / math.tan(math.pi / 4 + phi1 / 2)
    )
    f = math.cos(phi1) * math.tan(math.pi / 4 + phi1 / 2) ** n / n
    rho = f / math.tan(math.pi / 4 + phi / 2) ** n
    rho0 = f / math.tan(math.pi / 4 + phi0 / 2) ** n
    return rho * math.sin(n * (lam - lam0)), rho * math.cos(n * (lam - lam0)) - rho0


def make_projector(rings: list[list[tuple[float, float]]]):
    samples = [
        lcc_raw(lon, lat)
        for ring in rings
        for lon, lat in ring
        if MIN_LON <= lon <= MAX_LON and MIN_LAT <= lat <= MAX_LAT
    ]
    min_x = min(x for x, _ in samples)
    max_x = max(x for x, _ in samples)
    min_y = min(y for _, y in samples)
    max_y = max(y for _, y in samples)
    scale = min((WIDTH - 2 * PAD) / (max_x - min_x), (HEIGHT - 2 * PAD) / (max_y - min_y))
    offset_x = (WIDTH - (max_x - min_x) * scale) / 2 - min_x * scale
    offset_y = (HEIGHT - (max_y - min_y) * scale) / 2 - min_y * scale

    def project(point: tuple[float, float]) -> tuple[float, float]:
        x, y = lcc_raw(*point)
        return x * scale + offset_x, y * scale + offset_y

    return project


def distance_squared(point, start, end) -> float:
    x, y = point
    ax, ay = start
    bx, by = end
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return (x - ax) ** 2 + (y - ay) ** 2
    t = max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
    px, py = ax + t * dx, ay + t * dy
    return (x - px) ** 2 + (y - py) ** 2


def rdp_open(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    if len(points) < 3:
        return points
    kept = {0, len(points) - 1}
    stack = [(0, len(points) - 1)]
    threshold = TOLERANCE * TOLERANCE
    while stack:
        start, end = stack.pop()
        farthest_index, farthest_distance = -1, threshold
        for index in range(start + 1, end):
            distance = distance_squared(points[index], points[start], points[end])
            if distance > farthest_distance:
                farthest_index, farthest_distance = index, distance
        if farthest_index >= 0:
            kept.add(farthest_index)
            stack.extend(((start, farthest_index), (farthest_index, end)))
    return [point for index, point in enumerate(points) if index in kept]


def simplify_ring(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    if len(points) < 5:
        return points
    open_ring = points[:-1] if points[0] == points[-1] else points[:]
    anchor = min(range(len(open_ring)), key=lambda index: (open_ring[index][0], open_ring[index][1]))
    rotated = open_ring[anchor:] + open_ring[:anchor]
    opposite = max(range(1, len(rotated)), key=lambda index: distance_squared(rotated[index], rotated[0], rotated[0]))
    first = rdp_open(rotated[: opposite + 1])
    second = rdp_open(rotated[opposite:] + [rotated[0]])
    return first[:-1] + second[:-1] + [first[0]]


def geometry_polygons(geometry: dict) -> list[list[list[list[float]]]]:
    if geometry["type"] == "Polygon":
        return [geometry["coordinates"]]
    if geometry["type"] == "MultiPolygon":
        return geometry["coordinates"]
    return []


def path_for_ring(points: list[tuple[float, float]]) -> str:
    first_x, first_y = points[0]
    return "".join([f"M{first_x:.2f},{first_y:.2f}", *(f"L{x:.2f},{y:.2f}" for x, y in points[1:]), "Z"])


def main() -> None:
    dataset = json.loads(SOURCE.read_text(encoding="utf-8"))
    country_polygons = []
    all_rings = []
    for feature in dataset["features"]:
        props = feature["properties"]
        if props.get("CONTINENT") != "Europe" and props.get("NAME") != "Turkey":
            continue
        for polygon in geometry_polygons(feature["geometry"]):
            outer = normalize_longitudes(polygon[0])
            if not has_visible_point(outer):
                continue
            rings = [outer] + [normalize_longitudes(hole) for hole in polygon[1:]]
            country_polygons.append(rings)
            all_rings.extend(rings)

    project = make_projector(all_rings)
    paths = []
    for polygon in country_polygons:
        rings = []
        for ring in polygon:
            projected = simplify_ring([project(point) for point in ring])
            if len(projected) >= 4:
                rings.append(path_for_ring(projected))
        if rings:
            paths.append(f'<path d="{"".join(rings)}"/>')

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 620" role="img" aria-label="Prototip realne karte Evrope za Pikado">
  <defs>
    <linearGradient id="sea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#315c71"/><stop offset="1" stop-color="#172d4b"/></linearGradient>
    <linearGradient id="land" gradientUnits="userSpaceOnUse" x1="250" y1="90" x2="760" y2="550"><stop offset="0" stop-color="#e3cf9d"/><stop offset=".46" stop-color="#b8b47e"/><stop offset="1" stop-color="#718d71"/></linearGradient>
    <pattern id="grid" width="100" height="62" patternUnits="userSpaceOnUse"><path d="M100 0H0V62" fill="none" stroke="#f0e5c5" stroke-opacity=".055" stroke-width="1"/></pattern>
    <filter id="land-effect" x="-10%" y="-10%" width="120%" height="120%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="2.5" result="expanded"/>
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
    <g fill="url(#land)" stroke="url(#land)" stroke-width="1.8" stroke-linejoin="round" fill-rule="evenodd" filter="url(#land-effect)" shape-rendering="geometricPrecision">
      {"\n      ".join(paths)}
    </g>
  </g>
  <path d="M68 73h56M96 45v56" stroke="#f6e5bc" stroke-opacity=".62" stroke-width="3" stroke-linecap="round"/><path d="M96 45 85 68h22Z" fill="#e9bc76"/>
</svg>
'''
    TARGET.write_text(svg, encoding="utf-8", newline="\n")
    print(f"Generated {TARGET.name}: {len(paths)} land polygons, {TARGET.stat().st_size} bytes")


if __name__ == "__main__":
    main()
