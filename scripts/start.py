#!/usr/bin/env python3
"""
Simple launcher for ErikOS
Opens browser and starts the Flask server
"""
import os
import sys
import time
import subprocess
import webbrowser
from pathlib import Path

def main():
    # Get the repository root directory
    repo_root = Path(__file__).resolve().parents[1]
    os.chdir(repo_root)

    # Server settings
    port = 8000

    # Start the Flask server
    print("Starting ErikOS server...")
    args = [sys.executable, "-u", "-m", "DRIVE.app"]
    proc = subprocess.Popen(args)

    # Wait a moment for server to start
    time.sleep(1.5)

    # Open browser
    url = f"http://127.0.0.1:{port}/"
    print(f"Opening browser at {url}")
    try:
        webbrowser.open(url)
    except Exception:
        print(f"Could not open browser automatically. Please navigate to {url}")

    # Wait for the server process
    try:
        proc.wait()
    except KeyboardInterrupt:
        print("\nStopping server...")
        proc.terminate()
        proc.wait()

    return proc.returncode

if __name__ == "__main__":
    sys.exit(main())
