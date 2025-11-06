"""
ErikOS - Simple static file server for Windows 2000 Desktop Emulator
"""

from flask import Flask, send_from_directory
from pathlib import Path

# Get the base directory (parent of DRIVE folder)
BASE_DIR = Path(__file__).parent.parent.absolute()

app = Flask(__name__, static_folder=str(BASE_DIR))

@app.route('/')
def index():
    """Serve the main index.html file"""
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """Serve any static file from the base directory"""
    return send_from_directory(BASE_DIR, path)

if __name__ == '__main__':
    print("=" * 50)
    print("ErikOS - Windows 2000 Desktop Emulator")
    print("=" * 50)
    print(f"Serving files from: {BASE_DIR}")
    print("Server running at: http://127.0.0.1:8000")
    print("Press Ctrl+C to stop")
    print("=" * 50)

    app.run(host='127.0.0.1', port=8000, debug=False)
