#!/usr/bin/env python3
"""Render an ASCII QR code for the provided URL."""
from __future__ import annotations

import sys


def _print_fallback(url: str) -> None:
    """Print a helpful fallback message when qrcode is unavailable."""
    print("Scan feature unavailable: install the 'qrcode' package to enable QR output.")
    print(url)


def main(argv: list[str] | None = None) -> int:
    args = sys.argv if argv is None else argv
    if len(args) < 2:
        print("Usage: print_qr.py <url>", file=sys.stderr)
        return 1

    url = args[1]
    try:
        import qrcode  # type: ignore
    except Exception:
        _print_fallback(url)
        return 0

    qr = qrcode.QRCode(border=1)
    qr.add_data(url)
    qr.make(fit=True)
    matrix = qr.get_matrix()

    dark = "\u2588\u2588"
    light = "  "

    print("Scan this QR code to open ErikOS:")
    for row in matrix:
        print("".join(dark if cell else light for cell in row))
    print(url)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
