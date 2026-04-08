"""
Utility functions — domain filtering, validation helpers.
"""

import re
from pathlib import Path
from app.config import settings

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

def get_db_path() -> Path:
    """Return the absolute path for Render Disk DB storage."""
    return Path("/var/data/db")


def get_college_db_path(college_id: str) -> Path:
    """Return the FAISS index folder for a college."""
    return get_db_path() / college_id


def get_college_data_path(college_id: str) -> Path:
    """Return the raw-documents folder for a college."""
    return Path(settings.DATA_DIR) / college_id


def validate_college_id(college_id: str) -> bool:
    """Allow only alphanumeric + underscores/hyphens."""
    return bool(re.match(r"^[a-zA-Z0-9_-]+$", college_id))


# ── Response templates ───────────────────────────────────────────

REJECTION_RESPONSE = "I can only help with admission-related queries. Please ask me about admissions, courses, fees, eligibility, or the application process."

FALLBACK_RESPONSE = "I don't have that specific information right now. Please contact the admission office directly for the most accurate details."
