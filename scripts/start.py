#!/usr/bin/env python3
import os, sys, time, subprocess, webbrowser
from pathlib import Path

def load_env():
    try:
        from dotenv import load_dotenv, find_dotenv
        load_dotenv(find_dotenv())
    except Exception:
        pass

def host_port():
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    return host, port

def main():
    repo_root = Path(__file__).resolve().parents[1]
    os.chdir(repo_root)
    load_env()
    host, port = host_port()

    env = os.environ.copy()
    env.setdefault("HOST", str(host))
    env.setdefault("PORT", str(port))

    args = [sys.executable, "-u", "-m", "DRIVE.app"]
    if len(sys.argv) > 1:
        args.extend(sys.argv[1:])

    proc = subprocess.Popen(args, env=env)
    time.sleep(1.5)
    local_url = f"http://127.0.0.1:{port}/"
    try:
        webbrowser.open(local_url)
    except Exception:
        pass
    try:
        proc.wait()
    except KeyboardInterrupt:
        proc.terminate()
        proc.wait()
    return proc.returncode

if __name__ == "__main__":
    sys.exit(main())
