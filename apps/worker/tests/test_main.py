from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint_returns_status():
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert "pandoc_available" in payload
    assert "version" in payload


def test_convert_direct_no_auth_required():
    response = client.post(
        "/convert-direct",
        data={
            "text": "# Test",
            "output_format": "html",
            "toc_depth": "3",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"completed", "failed"}


def test_analyze_no_auth_required():
    response = client.post(
        "/analyze",
        files={"file": ("doc.md", b"# test", "text/markdown")},
        data={"target_format": "pdf"},
    )

    # Should succeed without auth
    assert response.status_code == 200


def test_api_versioning_prefix():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["pandoc_available"] is True


def test_request_id_tracing_middleware():
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
