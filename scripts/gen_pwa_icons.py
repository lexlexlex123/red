#!/usr/bin/env python3
"""Generate PWA PNG icons (192, 512) from icons/icon.svg or a simple fallback drawing."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "icons"
SVG = ICONS / "icon.svg"


def draw_fallback(size: int):
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return None
    img = Image.new("RGBA", (size, size), (26, 26, 46, 255))
    d = ImageDraw.Draw(img)
    m = size // 16
    x1, y1 = m * 2, m * 3
    x2, y2 = size - m * 2, size - m * 5
    r = size // 18
    d.rounded_rectangle([x1, y1, x2, y2], radius=r, fill=(59, 130, 246, 45), outline=(59, 130, 246, 255), width=max(2, size // 32))
    d.line([(x1, y1 + r * 2), (x2, y1 + r * 2)], fill=(59, 130, 246, 120), width=max(2, size // 42))
    bar_w = (x2 - x1) * 3 // 5
    bar_h = max(4, size // 26)
    d.rounded_rectangle([x1 + r, y1 + r * 3, x1 + r + bar_w, y1 + r * 3 + bar_h], radius=bar_h // 2, fill=(59, 130, 246, 180))
    cx = size // 2
    stem = size // 8
    d.line([(cx, size - m * 2), (cx, size - m)], fill=(59, 130, 246, 255), width=max(3, size // 28))
    d.line([(cx - stem, size - m * 2), (cx + stem, size - m * 2)], fill=(59, 130, 246, 255), width=max(3, size // 28))
    return img


def from_svg(size: int):
    try:
        import cairosvg
        import io
        from PIL import Image
    except ImportError:
        return None
    if not SVG.is_file():
        return None
    png = cairosvg.svg2png(url=str(SVG), output_width=size, output_height=size)
    return Image.open(io.BytesIO(png)).convert("RGBA")


def main():
    ICONS.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        out = ICONS / f"icon-{size}.png"
        img = from_svg(size) or draw_fallback(size)
        if img is None:
            print("Install pillow for icons: pip install pillow")
            print("  (optional: pip install cairosvg for SVG render)")
            return 1
        img.save(out, "PNG")
        print(f"Wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
