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


def _root_dir() -> Path:
    """Determine a valid application root directory.

    If ``ROOT_DIR`` is set in the environment use it when it points to an
    existing path.  Otherwise fall back to the repository base directory.  This
    avoids issues on Windows where an absolute path from another environment
    may not exist.
    """

    candidate = Path(os.getenv("ROOT_DIR", BASE_DIR))
    if not candidate.is_absolute():
        candidate = (BASE_DIR / candidate).resolve()
    else:
        candidate = candidate.resolve()
    if not candidate.exists():
        candidate = BASE_DIR
    return candidate


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
    root_dir: Path = field(default_factory=_root_dir)
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    terminal_whitelist: list[str] = field(
        default_factory=lambda: _split_csv(
            os.getenv("TERMINAL_WHITELIST", "ls,dir,echo,ping,ollama")
        )
    )
    max_upload_mb: int = int(os.getenv("MAX_UPLOAD_MB", "25"))


settings = Settings()
