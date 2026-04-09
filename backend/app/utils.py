"""
Utility functions — domain filtering, validation helpers.
"""
from __future__ import annotations

import re
import os
import logging
from pathlib import Path
from app.config import settings

logger = logging.getLogger(__name__)

# ── Domain filter ────────────────────────────────────────────────
# Keywords that signal non-admission queries
_BLOCKED_TOPICS = [
    "cricket", "football", "soccer", "basketball", "sport",
    "movie", "film", "bollywood", "hollywood", "song", "music",
    "politics", "election", "minister", "president", "government",
    "recipe", "cooking", "food",
    "weather", "stock", "share market", "cryptocurrency", "bitcoin",
    "game", "gaming", "fortnite", "pubg",
    "joke", "meme", "funny",
]

_BLOCKED_RE = re.compile(
    r"\b(" + "|".join(re.escape(kw) for kw in _BLOCKED_TOPICS) + r")\b",
    re.IGNORECASE,
)


def is_admission_related(question: str) -> bool:
    """Return True if the question does NOT match any blocked topic."""
    return _BLOCKED_RE.search(question) is None


# ── Path helpers ─────────────────────────────────────────────────

def init_storage():
    """Ensure persistent storage directories exist at runtime.

    On Render (Linux) this creates /var/data/*. On local dev (Windows)
    this is a no-op — we fall back to a local ./db directory instead.
    """
    db_dir = settings.FAISS_DB_DIR
    data_dir = settings.DATA_DIR
    try:
        os.makedirs(db_dir, exist_ok=True)
        logger.info(f"[STORAGE] Ensured DB dir exists: {db_dir}")
    except OSError as e:
        logger.warning(f"[STORAGE] Could not create DB dir '{db_dir}': {e}")
    try:
        os.makedirs(data_dir, exist_ok=True)
        logger.info(f"[STORAGE] Ensured DATA dir exists: {data_dir}")
    except OSError as e:
        logger.warning(f"[STORAGE] Could not create DATA dir '{data_dir}': {e}")


def get_db_path() -> Path:
    """Return the absolute path for FAISS Vector storage."""
    return Path(settings.FAISS_DB_DIR)

def get_documents_path() -> Path:
    """Return the absolute path for uploaded PDF/text files."""
    return Path(settings.DATA_DIR)

def get_college_db_path(college_id: str) -> Path:
    """Return the FAISS index folder for a specific college."""
    return get_db_path() / college_id

def get_college_data_path(college_id: str) -> Path:
    """Return the raw-documents folder for a specific college."""
    return get_documents_path() / college_id


def validate_college_id(college_id: str) -> bool:
    """Allow only alphanumeric + underscores/hyphens."""
    return bool(re.match(r"^[a-zA-Z0-9_-]+$", college_id))


# ── Response templates ───────────────────────────────────────────

REJECTION_RESPONSE = "I can only help with admission-related queries. Please ask me about admissions, courses, fees, eligibility, or the application process."

FALLBACK_RESPONSE = "I don't have that specific information right now. Please contact the admission office directly for the most accurate details."
