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


# ── Path helpers removed in favor of Supabase ────────────────────


def validate_college_id(college_id: str) -> bool:
    """Allow only alphanumeric + underscores/hyphens."""
    return bool(re.match(r"^[a-zA-Z0-9_-]+$", college_id))


# ── Response templates ───────────────────────────────────────────

REJECTION_RESPONSE = "I can only help with admission-related queries. Please ask me about admissions, courses, fees, eligibility, or the application process."

FALLBACK_RESPONSE = "I don't have that specific information right now. Please contact the admission office directly for the most accurate details."
