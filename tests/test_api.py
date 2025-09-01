import pytest
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from DRIVE.app import app
from tools.diagnostics import run_diagnostics


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_status_endpoint(client):
    resp = client.get("/api/status")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "status" in data and "version" in data


def test_list_icons(client):
    resp = client.get("/api/list-icons")
    assert resp.status_code == 200
    data = resp.get_json()
    assert isinstance(data.get("icons"), list)


def test_health_endpoint(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data.get("ok") is True


def test_version_endpoint(client):
    resp = client.get("/api/version")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "version" in data


def test_file_manager_invalid_paths(client):
    headers = {"X-User-Id": "tester"}
    resp = client.get("/api/list-directory", query_string={"path": "../"}, headers=headers)
    assert resp.status_code == 400
    resp = client.post(
        "/api/create-folder", json={"path": "../", "name": "x"}, headers=headers
    )
    assert resp.status_code == 400
    resp = client.post(
        "/api/rename", json={"path": "../a", "new_name": "b"}, headers=headers
    )
    assert resp.status_code == 400
    resp = client.post("/api/delete", json={"path": "../a"}, headers=headers)
    assert resp.status_code == 400


def test_windows_style_traversal_blocked(client):
    """Backslashes should be treated as path separators and rejected."""
    resp = client.get(
        "/api/list-directory", query_string={"path": "..\\"}, headers={"X-User-Id": "tester"}
    )
    assert resp.status_code == 400
    data = resp.get_json()
    assert data.get("error") == "Invalid path"


def test_diagnostics_missing_icon():
    target = Path("src/js/apps/notepad.js")
    original = target.read_text(encoding="utf-8")
    try:
        target.write_text(
            original
            + "\nexport const missing={icon:'/icons/does-not-exist.png'};\n",
            encoding="utf-8",
        )
        result = run_diagnostics(app)
    finally:
        target.write_text(original, encoding="utf-8")
    assert any(
        "Missing icon file: /icons/does-not-exist.png" in issue
        for issue in result.get("issues", [])
    )
