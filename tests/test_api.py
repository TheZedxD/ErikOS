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


def test_file_manager_invalid_paths(client):
    resp = client.get("/api/list-directory", query_string={"path": "../"})
    assert resp.status_code == 400
    resp = client.post("/api/create-folder", json={"path": "../", "name": "x"})
    assert resp.status_code == 400
    resp = client.post("/api/rename", json={"path": "../a", "new_name": "b"})
    assert resp.status_code == 400
    resp = client.post("/api/delete", json={"path": "../a"})
    assert resp.status_code == 400


def test_diagnostics_missing_icon():
    main_js = Path("main.js")
    original = main_js.read_text(encoding="utf-8")
    try:
        main_js.write_text(
            original + "\nconst missing={icon: \"icons/does-not-exist.png\"};\n",
            encoding="utf-8",
        )
        result = run_diagnostics(app)
    finally:
        main_js.write_text(original, encoding="utf-8")
    assert any(
        "Missing icon file: icons/does-not-exist.png" in issue
        for issue in result.get("issues", [])
    )
