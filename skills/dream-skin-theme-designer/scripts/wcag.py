"""WCAG relative luminance and contrast ratio helpers. Stdlib only."""
import colorsys
import re


def parse_color(value):
    """Accept #rgb/#rrggbb/#rrggbbaa or 'rgba(r,g,b,a)'. Returns (r,g,b) ints 0-255."""
    value = value.strip()
    if value.startswith("#"):
        h = value[1:]
        if len(h) in (3, 4):
            h = "".join(c * 2 for c in h[:3])
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        return (r, g, b)
    m = re.match(r"rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)", value, re.I)
    if m:
        return tuple(int(round(float(x))) for x in m.groups())
    raise ValueError(f"Unrecognized color: {value}")


def to_hex(rgb):
    r, g, b = (max(0, min(255, round(c))) for c in rgb)
    return f"#{r:02x}{g:02x}{b:02x}"


def _linear(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def relative_luminance(rgb):
    r, g, b = rgb
    return 0.2126 * _linear(r) + 0.7152 * _linear(g) + 0.0722 * _linear(b)


def contrast_ratio(rgb1, rgb2):
    l1, l2 = relative_luminance(rgb1), relative_luminance(rgb2)
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def rgb_to_hls(rgb):
    r, g, b = (c / 255 for c in rgb)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360, l, s


def hls_to_rgb(h, l, s):
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360, l, s)
    return (r * 255, g * 255, b * 255)


def clamp(value, lo, hi):
    return max(lo, min(hi, value))
