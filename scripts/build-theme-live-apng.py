"""Package the seven complete stills and their transparent PNG frames as APNGs.

The first frame is the original scene, so an APNG-unaware viewer shows the
ordinary background. Later frames are transparent motion layers blended over
that scene and restored after display.
"""

from __future__ import annotations

import argparse
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRAME_ROOT = ROOT / "tmp" / "theme-apng-frames"
ASSET_ROOT = ROOT / "www" / "assets" / "theme-live-v2"
THEMES = ("drzava", "okean", "grad", "planina", "biljka", "zivotinja", "predmet")
SIGNATURE = b"\x89PNG\r\n\x1a\n"


def chunks(data: bytes) -> list[tuple[bytes, bytes]]:
    if not data.startswith(SIGNATURE):
        raise ValueError("Invalid PNG signature")
    result = []
    position = len(SIGNATURE)
    while position < len(data):
        length = struct.unpack_from(">I", data, position)[0]
        kind = data[position + 4 : position + 8]
        payload = data[position + 8 : position + 8 + length]
        expected = struct.unpack_from(">I", data, position + 8 + length)[0]
        if zlib.crc32(kind + payload) != expected:
            raise ValueError(f"Invalid CRC in {kind!r}")
        result.append((kind, payload))
        position += length + 12
        if kind == b"IEND":
            break
    return result


def chunk(kind: bytes, payload: bytes) -> bytes:
    return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload))


def dimensions(parts: list[tuple[bytes, bytes]]) -> tuple[int, int]:
    header = next(payload for kind, payload in parts if kind == b"IHDR")
    width, height, bit_depth, color_type, compression, filtering, interlace = struct.unpack(">IIBBBBB", header)
    if (bit_depth, color_type, compression, filtering, interlace) != (8, 6, 0, 0, 0):
        raise ValueError("Expected non-interlaced 8-bit RGBA PNG frames")
    return width, height


def frame_control(sequence: int, width: int, height: int, duration_ms: int, dispose: int, blend: int) -> bytes:
    return struct.pack(">IIIIIHHBB", sequence, width, height, 0, 0, duration_ms, 1000, dispose, blend)


def build(
    theme: str,
    frame_count: int,
    duration_ms: int,
    frame_root: Path = FRAME_ROOT,
    asset_root: Path = ASSET_ROOT,
    base_duration_ms: int | None = None,
) -> Path:
    folder = frame_root / theme
    base = chunks((folder / "base.png").read_bytes())
    width, height = dimensions(base)
    frames = [chunks((folder / f"frame-{index:02d}.png").read_bytes()) for index in range(frame_count)]
    if any(dimensions(frame) != (width, height) for frame in frames):
        raise ValueError(f"Frame size differs for {theme}")

    output = bytearray(SIGNATURE)
    header = next(payload for kind, payload in base if kind == b"IHDR")
    output += chunk(b"IHDR", header)
    for kind, payload in base:
        if kind not in (b"IHDR", b"IDAT", b"IEND"):
            output += chunk(kind, payload)
    output += chunk(b"acTL", struct.pack(">II", frame_count + 1, 0))

    sequence = 0
    output += chunk(b"fcTL", frame_control(sequence, width, height, base_duration_ms or duration_ms, 0, 0))
    sequence += 1
    for kind, payload in base:
        if kind == b"IDAT":
            output += chunk(kind, payload)

    for frame in frames:
        output += chunk(b"fcTL", frame_control(sequence, width, height, duration_ms, 2, 1))
        sequence += 1
        for kind, payload in frame:
            if kind == b"IDAT":
                output += chunk(b"fdAT", struct.pack(">I", sequence) + payload)
                sequence += 1
    output += chunk(b"IEND", b"")

    asset_root.mkdir(parents=True, exist_ok=True)
    destination = asset_root / f"{theme}-live.png"
    destination.write_bytes(output)
    # Reparse every chunk, including checksums, before accepting the asset.
    verified = chunks(destination.read_bytes())
    if sum(kind == b"fcTL" for kind, _ in verified) != frame_count + 1:
        raise ValueError(f"Missing APNG frames in {destination}")
    return destination


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--frames", type=int, default=24)
    parser.add_argument("--duration-ms", type=int, default=125)
    parser.add_argument("--base-duration-ms", type=int)
    parser.add_argument("--frame-root", type=Path, default=FRAME_ROOT)
    parser.add_argument("--asset-root", type=Path, default=ASSET_ROOT)
    parser.add_argument("--themes", default=",".join(THEMES))
    args = parser.parse_args()
    if args.frames < 2 or not 20 <= args.duration_ms <= 1000:
        parser.error("Use at least two frames and a duration between 20 and 1000 ms")
    if args.base_duration_ms is not None and not 1 <= args.base_duration_ms <= 1000:
        parser.error("Base duration must be between 1 and 1000 ms")
    for theme in args.themes.split(","):
        output = build(theme, args.frames, args.duration_ms, args.frame_root, args.asset_root, args.base_duration_ms)
        print(f"{output.name}: {args.frames + 1} frames, {output.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
