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

import argparse
import os
import shutil
import sys
from pathlib import Path

try:
    from PIL import Image  # type: ignore
except ImportError as exc:
    raise SystemExit(
        "Pillow is required for this script. Please install it with 'pip install pillow'."
    ) from exc


def make_transparent(path: Path, backup: bool = True) -> None:
    """Replace white background in a PNG with transparency.

    Args:
        path: Path to the PNG file.
    """
    with Image.open(path) as img:
        img = img.convert("RGBA")
        datas = img.getdata()
        new_data = []
        for pixel in datas:
            if pixel[0:3] == (255, 255, 255):
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(pixel)
        img.putdata(new_data)
        if backup:
            bak = path.with_suffix(path.suffix + ".bak")
            if not bak.exists():
                shutil.copy2(path, bak)
        img.save(path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Process PNG icons")
    parser.add_argument("folder", help="folder containing PNG icons")
    parser.add_argument(
        "--backup",
        dest="backup",
        action="store_false",
        help="Disable backups",
    )
    args = parser.parse_args()

    folder = Path(args.folder)
    if not folder.is_dir():
        print(f"The specified path '{folder}' is not a directory.")
        return
    for item in folder.iterdir():
        if item.suffix.lower() == ".png" and item.is_file():
            try:
                make_transparent(item, backup=args.backup)
                print(f"Processed {item.name}")
            except Exception as exc:
                print(f"Failed to process {item.name}: {exc}")
    print("Processing complete.")


if __name__ == "__main__":
    main()
