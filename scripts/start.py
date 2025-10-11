#!/usr/bin/env python3
import os, sys, time, subprocess, webbrowser
from pathlib import Path

def load_env():
    try:
        from dotenv import load_dotenv, find_dotenv
        load_dotenv(find_dotenv())
    except Exception:
        pass  # optional

def env_host_port():
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    return host, port

def wait_for_server(url: str, timeout=20):
    start = time.time()
    try:
        import requests
        while time.time() - start < timeout:
            try:
                r = requests.get(url, timeout=0.75)
                if r.status_code < 500:
                    return True
            except Exception:
                time.sleep(0.5)
        return False
    except Exception:
        # requests not available; best-effort delay
        time.sleep(2)
        return True

def main():
    repo_root = Path(__file__).resolve().parents[1]
    os.chdir(repo_root)

    load_env()
    host, port = env_host_port()

    # Prepare env for child (allow app to read HOST/PORT)
    env = os.environ.copy()
    env.setdefault("HOST", str(host))
    env.setdefault("PORT", str(port))

    # Start Flask app as module
    args = [sys.executable, "-u", "-m", "DRIVE.app"]
    # Append any extra args given to this launcher
    if len(sys.argv) > 1:
        args.extend(sys.argv[1:])

    server = subprocess.Popen(args, env=env)

    try:
        local_url = f"http://127.0.0.1:{port}/"
        if wait_for_server(local_url, timeout=20):
            webbrowser.open(local_url)
        else:
            print(f"[warn] Server not detected on {local_url} within timeout—opening anyway.")
            webbrowser.open(local_url)
        server.wait()
    except KeyboardInterrupt:
        server.terminate()
        server.wait()
    finally:
        return server.returncode

if __name__ == "__main__":
    sys.exit(main())
