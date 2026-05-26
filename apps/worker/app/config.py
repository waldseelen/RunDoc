"""
Pandoc Orchestrator — Worker Configuration
Manages environment variables and application settings.
"""

import os
from dataclasses import dataclass, field
from typing import List

try:
    from dotenv import load_dotenv
    load_dotenv()  # Load from current working directory
    # Also load from the worker directory root specifically
    worker_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    load_dotenv(os.path.join(worker_root, ".env"))
except ImportError:
    pass


def _get_bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _get_list_env(name: str, default: List[str]) -> List[str]:
    value = os.getenv(name)
    if not value:
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass
class Settings:
    """Application settings loaded from environment variables."""

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

    # Security
    allowed_origins: List[str] = field(
        default_factory=lambda: _get_list_env(
            "ALLOWED_ORIGINS",
            ["*"]
        )
    )

    # Pandoc
    pandoc_path: str = field(
        default_factory=lambda: os.getenv("PANDOC_PATH", "pandoc")
    )


settings = Settings()
