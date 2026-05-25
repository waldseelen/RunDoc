"""
Pandoc Orchestrator — Worker Configuration
Manages environment variables and application settings.
"""

import os
from dataclasses import dataclass, field


@dataclass
class Settings:
    """Application settings loaded from environment variables."""

    # Supabase
    supabase_url: str = field(
        default_factory=lambda: os.getenv("SUPABASE_URL", "")
    )
    supabase_service_key: str = field(
        default_factory=lambda: os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    )

    # Worker
    worker_temp_dir: str = field(
        default_factory=lambda: os.getenv("WORKER_TEMP_DIR", "/tmp/pandoc-workdir")
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
