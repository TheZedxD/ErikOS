#!/bin/bash
#
# start_server.sh – Simple launcher script for the Win95‑style browser desktop
#
# This script starts a local HTTP server so that the File System Access API
# functions correctly.  It requires Python 3 to be installed.  The server
# listens on port 8000 by default.

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "Starting local HTTP server on http://localhost:8000 ..."
echo "Press Ctrl+C to stop."

python3 -m http.server 8000