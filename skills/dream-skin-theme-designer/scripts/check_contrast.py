#!/usr/bin/env python3
"""Validate every text/surface pairing in a draft theme.json colors block.

Usage: python check_contrast.py <theme.json>

Checks the pairings that actually render as text-on-surface in Codex Dream Skin:
  text on background / panel / panelAlt   (AA normal text: >= 4.5:1)
  muted on background / panel / panelAlt  (AA normal text: >= 4.5:1, warn under 3:1)
  accent on panel                          (used for focus rings / links: >= 3:1 UI-component threshold)
  highlight on panel
Exits 1 if any AA-required pairing fails.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from wcag import contrast_ratio, parse_color  # noqa: E402

AA_TEXT = 4.5
AA_UI = 3.0

PAIRS = [
    ("text", "background", AA_TEXT, True),
    ("text", "panel", AA_TEXT, True),
    ("text", "panelAlt", AA_TEXT, True),
    ("muted", "background", AA_TEXT, False),
    ("muted", "panel", AA_TEXT, False),
    ("accent", "panel", AA_UI, False),
    ("highlight", "panel", AA_UI, False),
]


def main():
    path = Path(sys.argv[1])
    theme = json.loads(path.read_text(encoding="utf-8"))
    colors = theme.get("colors", {})
    if not colors:
        print("No colors block found in theme.json", file=sys.stderr)
        sys.exit(2)

    failed = False
    print(f"Contrast check: {path}")
    for fg_key, bg_key, threshold, required in PAIRS:
        fg, bg = colors.get(fg_key), colors.get(bg_key)
        if not fg or not bg:
            continue
        ratio = contrast_ratio(parse_color(fg), parse_color(bg))
        status = "OK " if ratio >= threshold else ("FAIL" if required else "WARN")
        if status == "FAIL":
            failed = True
        print(f"  [{status}] {fg_key}({fg}) on {bg_key}({bg}): {ratio:.2f}:1  (need >= {threshold}:1)")

    if failed:
        print("\nFAILED: one or more required text pairings are below AA 4.5:1.", file=sys.stderr)
        sys.exit(1)
    print("\nAll required pairings pass.")


if __name__ == "__main__":
    main()
