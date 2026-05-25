"""
Pandoc Orchestrator — Worker Configuration
Manages environment variables and application settings.
"""

import os
from dataclasses import dataclass, field


@dataclass
class Settings:
    """Application settings loaded from environment variables."""

    # Firebase
    firebase_service_account_path: str = field(
        default_factory=lambda: os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./firebase-service-account.json")
    )
    firebase_storage_bucket: str = field(
        default_factory=lambda: os.getenv("FIREBASE_STORAGE_BUCKET", "")
    )

    # Worker
    worker_api_url: str = field(
        default_factory=lambda: os.getenv("WORKER_API_URL", "http://localhost:8000")
    )
    worker_temp_dir: str = field(
        default_factory=lambda: os.getenv("WORKER_TEMP_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "temp_workdir"))
    )
    max_timeout: int = field(
        default_factory=lambda: int(os.getenv("WORKER_MAX_TIMEOUT", "120"))
    )
    max_file_size_mb: int = field(
        default_factory=lambda: int(os.getenv("WORKER_MAX_FILE_SIZE_MB", "50"))
    )

    # Pandoc
    pandoc_path: str = field(
        default_factory=lambda: os.getenv("PANDOC_PATH", "pandoc")
    )


settings = Settings()
