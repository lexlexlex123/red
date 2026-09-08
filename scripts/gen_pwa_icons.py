#!/usr/bin/env python3
"""Опциональная генерация PNG из SVG (не трогает ваши готовые icon-*.png).

По умолчанию ничего не перезаписывает. Иконки приложения и file-document
держите в icons/ вручную.

  python scripts/gen_pwa_icons.py --file-doc   # только file-document-*.png из SVG
  python scripts/gen_pwa_icons.py --app        # только icons/icon-*.png из icons/icon.svg
"""
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "icons"
APP_SVG = ICONS / "icon.svg"
FILE_DOC_SVG = ICONS / "file-document.svg"


def from_svg(path: Path, size: int):
    try:
        import cairosvg
        import io
        from PIL import Image
    except (ImportError, OSError):
        return None
    if not path.is_file():
        return None
    try:
        png = cairosvg.svg2png(url=str(path), output_width=size, output_height=size)
        return Image.open(io.BytesIO(png)).convert("RGBA")
    except (OSError, Exception):
        return None


def main():
    ap = argparse.ArgumentParser(description="Generate PWA PNGs from SVG (optional)")
    ap.add_argument("--app", action="store_true", help="Write icons/icon-192.png and icon-512.png")
    ap.add_argument("--file-doc", action="store_true", help="Write icons/file-document-192/512.png")
    args = ap.parse_args()
    if not args.app and not args.file_doc:
        print("Ничего не сделано. Укажите --app или --file-doc (иконки в icons/ обычно правите вручную).")
        return 0

    if args.app:
        for size in (192, 512):
            out = ICONS / f"icon-{size}.png"
            img = from_svg(APP_SVG, size)
            if img is None:
                print(f"Не удалось создать {out} (нужны pillow + cairosvg/cairo или правьте PNG вручную)")
                return 1
            img.save(out, "PNG")
            print(f"Wrote {out}")

    if args.file_doc:
        for size in (192, 512):
            out = ICONS / f"file-document-{size}.png"
            img = from_svg(FILE_DOC_SVG, size)
            if img is None:
                print(f"Не удалось создать {out}")
                return 1
            img.save(out, "PNG")
            print(f"Wrote {out}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
