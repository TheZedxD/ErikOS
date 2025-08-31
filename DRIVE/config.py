from __future__ import annotations

"""Application configuration loaded from environment variables.

This module centralises configuration for the Flask backend. Values are
read from a ``.env`` file in the repository root if present and fall back to
sane defaults otherwise.
"""

from dataclasses import dataclass, field
import os
from pathlib import Path
from dotenv import load_dotenv

# Repository root
BASE_DIR = Path(__file__).resolve().parents[1]

# Load .env if it exists
load_dotenv(BASE_DIR / ".env")


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass
class Settings:
    host: str = os.getenv("HOST", "127.0.0.1")
    port: int = int(os.getenv("PORT", "8000"))
    allowed_origins: list[str] = field(
        default_factory=lambda: _split_csv(
            os.getenv(
                "ALLOWED_ORIGINS",
                "http://localhost:8000,http://127.0.0.1:8000",
            )
        )
    )
    root_dir: Path = Path(os.getenv("ROOT_DIR", BASE_DIR)).resolve()
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    terminal_whitelist: list[str] = field(
        default_factory=lambda: _split_csv(
            os.getenv("TERMINAL_WHITELIST", "ls,dir,echo,ping")
        )
    )
    max_upload_mb: int = int(os.getenv("MAX_UPLOAD_MB", "25"))


settings = Settings()
