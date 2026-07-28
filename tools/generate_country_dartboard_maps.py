"""Create precise, game-ready country maps for Geografski pikado.

The source is the locally cached Natural Earth 1:10m country data.  Each SVG
keeps the established soft-clay card style while its geometry and city targets
are projected from real latitude/longitude coordinates.
"""

from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(os.environ["TEMP"]) / "ne_10m_admin_0_countries.geojson"
ASSETS = ROOT / "www" / "assets"

VIEW_W = 1000
VIEW_H = 620
PAD_X = 112
PAD_Y = 54
NEARBY_ISLAND_DISTANCE = 2.25


@dataclass(frozen=True)
class MapSpec:
    iso: str
    label: str
    cities: tuple[tuple[str, float, float], ...]


MAPS: dict[str, MapSpec] = {
    "portugal": MapSpec("PRT", "Portugala", (("Lisabon", -9.1393, 38.7223),)),
    "spanija": MapSpec("ESP", "Španije", (("Madrid", -3.7038, 40.4168),)),
    "irska": MapSpec("IRL", "Irske", (("Dablin", -6.2603, 53.3498),)),
    "ujedinjeno-kraljevstvo": MapSpec("GBR", "Ujedinjenog Kraljevstva", (("London", -0.1278, 51.5074),)),
    "ceska": MapSpec("CZE", "Češke", (("Prag", 14.4378, 50.0755),)),
    "madjarska": MapSpec("HUN", "Mađarske", (("Budimpešta", 19.0402, 47.4979),)),
    "rumunija": MapSpec("ROU", "Rumunije", (("Bukurešt", 26.1025, 44.4268),)),
    "austrija": MapSpec("AUT", "Austrije", (("Beč", 16.3738, 48.2082),)),
    "hrvatska": MapSpec("HRV", "Hrvatske", (("Zagreb", 15.9819, 45.8150),)),
    "severna-makedonija": MapSpec("MKD", "Severne Makedonije", (("Skoplje", 21.4254, 41.9981),)),
    "poljska": MapSpec("POL", "Poljske", (("Varšava", 21.0122, 52.2297),)),
    "danska": MapSpec("DNK", "Danske", (("Kopenhagen", 12.5683, 55.6761),)),
    # Existing files are deliberately refreshed from the same precise source.
    "nemacka": MapSpec("DEU", "Nemačke", (("Berlin", 13.4050, 52.5200),)),
    "grcka": MapSpec("GRC", "Grčke", (("Atina", 23.7275, 37.9838),)),
}


def mercator_y(latitude: float) -> float:
    latitude = max(-85.0, min(85.0, latitude))
    return -math.log(math.tan(math.pi / 4 + math.radians(latitude) / 2))


def iter_polygons(geometry: dict) -> list[list[list[list[float]]]]:
    if geometry["type"] == "Polygon":
        return [geometry["coordinates"]]
    if geometry["type"] == "MultiPolygon":
        return geometry["coordinates"]
    return []


def polygon_bounds(polygon: list[list[list[float]]]) -> tuple[float, float, float, float]:
    longitudes, latitudes = zip(*polygon[0])
    return min(longitudes), max(longitudes), min(latitudes), max(latitudes)


def ring_area(ring: list[list[float]]) -> float:
    return abs(sum(
        x1 * y2 - x2 * y1
        for (x1, y1), (x2, y2) in zip(ring, ring[1:])
    )) / 2


def bounds_gap(
    left: tuple[float, float, float, float],
    right: tuple[float, float, float, float],
) -> float:
    lon_gap = max(left[0] - right[1], right[0] - left[1], 0)
    lat_gap = max(left[2] - right[3], right[2] - left[3], 0)
    return math.hypot(lon_gap * 0.72, lat_gap)


def relevant_polygons(geometry: dict) -> list[list[list[list[float]]]]:
    """Keep mainland and nearby islands, but exclude remote overseas territories.

    This matches the existing France and Italy game maps: Corsica, Sicily and
    nearby islands are visible; far-away territory would make the city target
    too small to play accurately on a phone.
    """

    polygons = iter_polygons(geometry)
    if not polygons:
        raise ValueError("Country feature has no polygon geometry.")

    mainland = max(polygons, key=lambda polygon: ring_area(polygon[0]))
    mainland_bounds = polygon_bounds(mainland)
    return [
        polygon
        for polygon in polygons
        if bounds_gap(polygon_bounds(polygon), mainland_bounds) <= NEARBY_ISLAND_DISTANCE
    ]


def projection_setup(polygons: list[list[list[list[float]]]]) -> tuple[float, float, float, float, float]:
    points = [point for polygon in polygons for ring in polygon for point in ring]
    longitudes, latitudes = zip(*points)
    min_lon, max_lon = min(longitudes), max(longitudes)
    min_y, max_y = mercator_y(max(latitudes)), mercator_y(min(latitudes))
    scale = min(
        (VIEW_W - 2 * PAD_X) / (math.radians(max_lon) - math.radians(min_lon)),
        (VIEW_H - 2 * PAD_Y) / (max_y - min_y),
    )
    offset_x = (VIEW_W - (math.radians(max_lon) - math.radians(min_lon)) * scale) / 2
    offset_y = (VIEW_H - (max_y - min_y) * scale) / 2
    return math.radians(min_lon), min_y, scale, offset_x, offset_y


def point_to_svg(longitude: float, latitude: float, setup: tuple[float, float, float, float, float]) -> tuple[float, float]:
    min_x, min_y, scale, offset_x, offset_y = setup
    return (
        offset_x + (math.radians(longitude) - min_x) * scale,
        offset_y + (mercator_y(latitude) - min_y) * scale,
    )


def ring_path(ring: list[list[float]], setup: tuple[float, float, float, float, float]) -> str:
    projected = [point_to_svg(longitude, latitude, setup) for longitude, latitude in ring]
    first_x, first_y = projected[0]
    commands = [f"M{first_x:.2f},{first_y:.2f}"]
    commands.extend(f"L{x:.2f},{y:.2f}" for x, y in projected[1:])
    commands.append("Z")
    return "".join(commands)


def country_path(polygons: list[list[list[list[float]]]], setup: tuple[float, float, float, float, float]) -> str:
    return "".join(
        ring_path(ring, setup)
        for polygon in polygons
        for ring in polygon
    )


def svg_document(label: str, path: str) -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW_W} {VIEW_H}" role="img" aria-label="Nema karta {label}">
  <defs>
    <linearGradient id="sea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#315c71"/><stop offset="1" stop-color="#172d4b"/></linearGradient>
    <linearGradient id="land" gradientUnits="userSpaceOnUse" x1="250" y1="82" x2="760" y2="590"><stop offset="0" stop-color="#e3cf9d"/><stop offset=".46" stop-color="#b8b47e"/><stop offset="1" stop-color="#718d71"/></linearGradient>
    <pattern id="grid" width="100" height="62" patternUnits="userSpaceOnUse"><path d="M100 0H0V62" fill="none" stroke="#f0e5c5" stroke-opacity=".055" stroke-width="1"/></pattern>
    <filter id="land-effect" x="-12%" y="-12%" width="124%" height="124%">
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
    <path d="{path}" fill="url(#land)" fill-rule="evenodd" filter="url(#land-effect)" shape-rendering="geometricPrecision"/>
  </g>
  <path d="M68 73h56M96 45v56" stroke="#f6e5bc" stroke-opacity=".62" stroke-width="3" stroke-linecap="round"/><path d="M96 45 85 68h22Z" fill="#e9bc76"/>
</svg>
'''


def find_feature(features: list[dict], iso: str) -> dict:
    return next(feature for feature in features if feature["properties"].get("ISO_A3") == iso)


def main() -> None:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    for map_id, spec in MAPS.items():
        feature = find_feature(data["features"], spec.iso)
        polygons = relevant_polygons(feature["geometry"])
        setup = projection_setup(polygons)
        path = country_path(polygons, setup)
        target = ASSETS / f"kviz-pikado-{map_id}.svg"
        target.write_text(svg_document(spec.label, path), encoding="utf-8", newline="\n")

        targets = []
        for _city, longitude, latitude in spec.cities:
            x, y = point_to_svg(longitude, latitude, setup)
            targets.append(f"{{ x: {x / 10:.2f}, y: {y / 6.2:.2f} }}")
        print(f"{map_id}: {', '.join(targets)}")


if __name__ == "__main__":
    main()
