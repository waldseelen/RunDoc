from fastapi.testclient import TestClient

from app.main import app
from app.config import settings


client = TestClient(app)


def _set_auth(required: bool, token: str = ""):
    settings.worker_require_auth = required
    settings.worker_api_token = token


def test_health_endpoint_returns_runtime_flags():
    _set_auth(False)
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert "pandoc_available" in payload
    assert payload["auth_required"] is False


def test_convert_direct_accepts_shared_token_auth():
    _set_auth(True, token="test-token")

    response = client.post(
        "/convert-direct",
        headers={"Authorization": "Bearer test-token"},
        data={
            "text": "# Test",
            "output_format": "html",
            "toc_depth": "3",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"completed", "failed"}


def test_analyze_requires_auth_when_enabled():
    _set_auth(True, token="test-token")

    response = client.post(
        "/analyze",
        files={"file": ("doc.md", b"# test", "text/markdown")},
        data={"target_format": "pdf"},
    )

    assert response.status_code == 401


def test_api_versioning_prefix():
    _set_auth(False)
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["pandoc_available"] is True


def test_request_id_tracing_middleware():
    _set_auth(False)
    # 1. Check generated request ID when header is missing
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert "X-Request-ID" in response.headers
    first_req_id = response.headers["X-Request-ID"]
    assert len(first_req_id) > 10

    # 2. Check header preservation when request ID is provided
    custom_id = "test-custom-request-id-123"
    response = client.get("/api/v1/health", headers={"X-Request-ID": custom_id})
    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == custom_id


def test_disk_space_validator_check(monkeypatch):
    _set_auth(False)

    # Mock shutil.disk_usage to return 0 free space
    import shutil
    def mock_disk_usage(path):
        # total, used, free
        return (1000000, 1000000, 0)
    
    monkeypatch.setattr(shutil, "disk_usage", mock_disk_usage)

    response = client.post(
        "/api/v1/convert-direct",
        data={
            "text": "# Test",
            "output_format": "html",
        },
    )

    # Should raise 507 Insufficient Storage
    assert response.status_code == 507
    assert "disk" in response.json()["detail"].lower()
