#!/usr/bin/env python3
"""Extract usable color data from a Dream Skin wallpaper for theme design.

Usage: python extract_palette.py <image_path> [--focus-x 0.5] [--focus-y 0.5]

Outputs JSON with:
  - dominant: whole-image quantized palette, sorted by pixel count (hex, rgb, hsl, luminance, share)
  - left_safe: same analysis for the x=0-52% zone (where sidebar/composer/dialog surfaces sit)
  - subject_zone: same analysis for the x=62-88% focal zone around focusX/focusY (where the art subject lives)
  - overall: average luminance + whether image reads as light or dark background

This script only measures pixels. It does NOT decide theme colors -- a wallpaper's
literal dominant color is often wrong for text/panel roles (e.g. a saturated pink
dominant color makes unreadable pink text). Use references/color-role-mapping.md
to turn these measurements into the 10 theme.json color roles, then verify every
text-on-surface pairing with wcag.py before writing theme.json.
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from wcag import relative_luminance, rgb_to_hls, to_hex  # noqa: E402


def region_palette(im, box, k=6):
    crop = im.crop(box) if box else im
    w, h = crop.size
    if w < 2 or h < 2:
        return []
    # Downscale for speed; quantize to k colors using PIL's median-cut.
    small = crop.copy()
    small.thumbnail((240, 240))
    quantized = small.convert("RGB").quantize(colors=k, method=Image.Quantize.MEDIANCUT)
    palette = quantized.getpalette()
    counts = quantized.getcolors()  # [(count, index), ...]
    total = sum(c for c, _ in counts) or 1
    entries = []
    for count, index in sorted(counts, reverse=True):
        r, g, b = palette[index * 3: index * 3 + 3]
        rgb = (r, g, b)
        h_, l_, s_ = rgb_to_hls(rgb)
        entries.append({
            "hex": to_hex(rgb),
            "rgb": [r, g, b],
            "hsl": [round(h_, 1), round(s_, 3), round(l_, 3)],
            "luminance": round(relative_luminance(rgb), 4),
            "share": round(count / total, 4),
        })
    return entries


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image_path")
    parser.add_argument("--focus-x", type=float, default=0.5)
    parser.add_argument("--focus-y", type=float, default=0.5)
    args = parser.parse_args()

    im = Image.open(args.image_path).convert("RGB")
    w, h = im.size

    left_safe_box = (0, 0, int(w * 0.52), h)

    fx, fy = args.focus_x, args.focus_y
    sx0, sx1 = clamp01(fx - 0.13) * w, clamp01(fx + 0.13) * w
    sy0, sy1 = clamp01(fy - 0.2) * h, clamp01(fy + 0.2) * h
    subject_box = (int(sx0), int(sy0), int(max(sx0 + 1, sx1)), int(max(sy0 + 1, sy1)))

    dominant = region_palette(im, None, k=8)
    left_safe = region_palette(im, left_safe_box, k=6)
    subject = region_palette(im, subject_box, k=6)

    def avg_luminance(entries):
        if not entries:
            return None
        return round(sum(e["luminance"] * e["share"] for e in entries) / sum(e["share"] for e in entries), 4)

    overall_lum = avg_luminance(dominant)
    left_lum = avg_luminance(left_safe)

    result = {
        "image": str(args.image_path),
        "size": [w, h],
        "dominant": dominant,
        "left_safe": left_safe,
        "left_safe_box_px": list(left_safe_box),
        "subject_zone": subject,
        "subject_box_px": list(subject_box),
        "overall": {
            "avg_luminance": overall_lum,
            "left_safe_avg_luminance": left_lum,
            "left_safe_reads_as": "light" if (left_lum or 0) > 0.5 else "dark",
        },
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


def clamp01(v):
    return max(0.0, min(1.0, v))


if __name__ == "__main__":
    main()
