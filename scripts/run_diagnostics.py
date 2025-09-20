#!/usr/bin/env python3
"""CLI entry point to run backend diagnostics."""
from __future__ import annotations

import json
import sys

from DRIVE.app import app
from tools.diagnostics import run_diagnostics


def main() -> int:
    result = run_diagnostics(app)
    print(json.dumps(result, indent=2))
    if result.get("ok"):
        return 0
    print("Diagnostics reported issues.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
