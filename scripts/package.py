#!/usr/bin/env python3
"""Package the ErikOS project into a distributable archive."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

from DRIVE.__version__ import __version__
DIST_DIR = BASE_DIR / "dist"
SKIP_DIRS = {".git", ".venv", "node_modules", "__pycache__", "logs", "dist"}
SKIP_SUFFIXES = {".pyc", ".pyo", ".log"}
SKIP_FILES = {".DS_Store"}


def should_skip(path: Path) -> bool:
    for part in path.parts:
        if part in SKIP_DIRS:
            return True
    if path.name in SKIP_FILES:
        return True
    if path.suffix in SKIP_SUFFIXES:
        return True
    return False


def build_archive(overwrite: bool = False) -> Path:
    DIST_DIR.mkdir(exist_ok=True)
    archive = DIST_DIR / f"ErikOS-{__version__}.zip"
    if archive.exists():
        if not overwrite:
            raise FileExistsError(
                f"{archive.name} already exists. Pass --overwrite to replace it."
            )
        archive.unlink()

    with ZipFile(archive, "w", ZIP_DEFLATED) as zf:
        for file in sorted(BASE_DIR.rglob("*")):
            if file.is_dir() or should_skip(file.relative_to(BASE_DIR)):
                continue
            zf.write(file, file.relative_to(BASE_DIR))
    return archive


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a distributable zip archive")
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="replace existing archive if it already exists",
    )
    args = parser.parse_args()

    try:
        archive = build_archive(overwrite=args.overwrite)
    except FileExistsError as exc:
        print(exc)
        return 1

    print(f"Created {archive.relative_to(BASE_DIR)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
