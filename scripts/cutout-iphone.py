#!/usr/bin/env python3
"""Вырезает iPhone с белого фона через rembg (как фото игроков) + прозрачное окно экрана."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image
from rembg import remove

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'public' / 'content'
SRC = CONTENT / 'iphone-15-pro-front.png'
CUTOUT = CONTENT / 'iphone-15-pro-cutout.png'
OVERLAY = CONTENT / 'iphone-15-pro-frame-overlay.png'
INSETS_JSON = CONTENT / 'iphone-15-pro-screen-insets.json'


def find_screen_hole(img: Image.Image) -> tuple[int, int, int, int]:
    """Находит экран: flood-fill от центра изображения по тёмным пикселям."""
    rgba = img.convert('RGBA')
    px = rgba.load()
    w, h = rgba.size
    cx, cy = w // 2, h // 2

    def is_dark(x: int, y: int) -> bool:
        r, g, b, a = px[x, y]
        return a > 40 and r <= 55 and g <= 55 and b <= 55

    if not is_dark(cx, cy):
        # fallback для 1024×1536
        return 232, 145, 790, 1356

    stack = [(cx, cy)]
    visited: set[tuple[int, int]] = set()
    min_x = max_x = cx
    min_y = max_y = cy

    while stack:
        x, y = stack.pop()
        if (x, y) in visited:
            continue
        if not (0 <= x < w and 0 <= y < h) or not is_dark(x, y):
            continue
        visited.add((x, y))
        min_x = min(min_x, x)
        max_x = max(max_x, x)
        min_y = min(min_y, y)
        max_y = max(max_y, y)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            stack.append((x + dx, y + dy))

    return min_x, min_y, max_x, max_y


def punch_screen(img: Image.Image, hole: tuple[int, int, int, int]) -> None:
    left, top, right, bottom = hole
    px = img.load()
    for y in range(top, bottom + 1):
        for x in range(left, right + 1):
            px[x, y] = (0, 0, 0, 0)


def insets_from_hole(w: int, h: int, hole: tuple[int, int, int, int]) -> dict[str, float]:
    left, top, right, bottom = hole
    return {
        'left': round(left / w * 100, 3),
        'top': round(top / h * 100, 3),
        'width': round((right - left + 1) / w * 100, 3),
        'height': round((bottom - top + 1) / h * 100, 3),
        'radius': 11.5,
    }


def main() -> int:
    if not SRC.exists():
        print(f'Missing source: {SRC}', file=sys.stderr)
        return 1

    print(f'rembg: {SRC.name}')
    raw = SRC.read_bytes()
    cutout_bytes = remove(raw)
    img = Image.open(__import__('io').BytesIO(cutout_bytes)).convert('RGBA')

    hole = find_screen_hole(img)
    print(f'screen hole px: {hole}')
    punch_screen(img, hole)

    insets = insets_from_hole(*img.size, hole)
    print(f'screen insets %: {insets}')

    img.save(CUTOUT, optimize=True)
    img.save(OVERLAY, optimize=True)
    INSETS_JSON.write_text(json.dumps(insets, indent=2), encoding='utf-8')

    print(f'saved {CUTOUT.relative_to(ROOT)}')
    print(f'saved {OVERLAY.relative_to(ROOT)}')
    print(f'saved {INSETS_JSON.relative_to(ROOT)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
