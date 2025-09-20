import time

import pytest

from DRIVE.app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def _wait_for_job(client, job_id):
    for _ in range(50):
        resp = client.get(f"/api/command-status/{job_id}")
        data = resp.get_json()
        if data.get("status") == "finished":
            return data
        time.sleep(0.05)
    raise AssertionError("command did not finish in time")


@pytest.mark.skipif(app.config.get("ENV") == "production", reason="not needed")
def test_linux_commands_execute(client, monkeypatch):
    monkeypatch.setattr("DRIVE.app._is_windows", lambda: False)
    resp = client.post("/api/execute-command", json={"command": "ls"})
    assert resp.status_code == 200
    job = _wait_for_job(client, resp.get_json()["job_id"])
    assert job["returncode"] == 0

    resp = client.post("/api/execute-command", json={"command": "cat README.md"})
    assert resp.status_code == 200
    job = _wait_for_job(client, resp.get_json()["job_id"])
    assert job["returncode"] == 0
    assert job["output"].strip()


def test_windows_builtins_use_cmd(monkeypatch, client):
    outputs = {"calls": []}

    class DummyProc:
        def __init__(self, args, stdout=None, stderr=None, text=None, shell=None):
            outputs["calls"].append({"args": args, "shell": shell})
            self.returncode = 0

        def communicate(self, timeout=None):
            return ("ok", "")

        def kill(self):
            pass

    monkeypatch.setattr("DRIVE.app._is_windows", lambda: True)
    monkeypatch.setattr("DRIVE.app.subprocess.Popen", DummyProc)

    for command in ["dir", "echo hello", "type LICENSE"]:
        outputs["calls"].clear()
        resp = client.post("/api/execute-command", json={"command": command})
        assert resp.status_code == 200
        job = _wait_for_job(client, resp.get_json()["job_id"])
        assert job["returncode"] == 0
        assert outputs["calls"]
        call = outputs["calls"][0]
        assert call["args"] == ["cmd", "/c", command]
        assert call["shell"] is True


def test_command_too_long(client):
    long_cmd = "a" * 2100
    resp = client.post("/api/execute-command", json={"command": long_cmd})
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["error"] == "Command too long"


def test_command_rejects_operators(client):
    resp = client.post("/api/execute-command", json={"command": "ls && whoami"})
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "Command contains unsupported operators"
