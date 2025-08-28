"""
process_icons.py – Utility script to make icon backgrounds transparent.

This script walks through a specified directory and processes all
PNG files found.  For each image it replaces pure white pixels
((255,255,255)) with fully transparent pixels.  The original files
are overwritten.  Any non‑image files are skipped with a warning.

Usage:
    python process_icons.py /path/to/icons

Dependencies:
    Pillow must be installed (`pip install pillow`).
"""

import sys
import os
from pathlib import Path

try:
    from PIL import Image  # type: ignore
except ImportError as exc:
    raise SystemExit(
        "Pillow is required for this script. Please install it with 'pip install pillow'."
    ) from exc


def make_transparent(path: Path) -> None:
    """Replace white background in a PNG with transparency.

    Args:
        path: Path to the PNG file.
    """
    with Image.open(path) as img:
        img = img.convert("RGBA")
        datas = img.getdata()
        new_data = []
        for pixel in datas:
            # If pixel is pure white, make it transparent
            if pixel[0:3] == (255, 255, 255):
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(pixel)
        img.putdata(new_data)
        img.save(path)


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: process_icons.py <folder>")
        return
    folder = Path(sys.argv[1])
    if not folder.is_dir():
        print(f"The specified path '{folder}' is not a directory.")
        return
    for item in folder.iterdir():
        if item.suffix.lower() == ".png" and item.is_file():
            try:
                make_transparent(item)
                print(f"Processed {item.name}")
            except Exception as exc:
                print(f"Failed to process {item.name}: {exc}")
    print("Processing complete.")


if __name__ == "__main__":
    main()