from pathlib import Path

from PIL import Image
import numpy as np


ROOT = Path(__file__).resolve().parent


def threshold_bbox(image: Image.Image, box=None, threshold=20):
    alpha = image.getchannel("A")
    if box is not None:
        alpha = alpha.crop(box)
    mask = alpha.point(lambda value: 255 if value > threshold else 0)
    bbox = mask.getbbox()
    if bbox is None or box is None:
        return bbox
    left, top, _, _ = box
    return (bbox[0] + left, bbox[1] + top, bbox[2] + left, bbox[3] + top)


for path in sorted(ROOT.glob("*-alpha.png")):
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    middle = width // 2
    alpha = np.asarray(image.getchannel("A")) > 20
    occupied_columns = np.flatnonzero(alpha.any(axis=0))
    column_groups = []
    if occupied_columns.size:
        first = previous = int(occupied_columns[0])
        for column in occupied_columns[1:]:
            column = int(column)
            if column > previous + 1:
                column_groups.append((first, previous + 1))
                first = column
            previous = column
        column_groups.append((first, previous + 1))
    component_boxes = [
        threshold_bbox(image, (left, 0, right, height))
        for left, right in column_groups
        if right - left > 2
    ]
    print(
        path.name,
        image.size,
        "all=", threshold_bbox(image),
        "left=", threshold_bbox(image, (0, 0, middle, height)),
        "right=", threshold_bbox(image, (middle, 0, width, height)),
        "components=", component_boxes,
    )
