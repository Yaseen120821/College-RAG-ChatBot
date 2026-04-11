"""
Supabase client initialisation.

Reads SUPABASE_URL and SUPABASE_KEY from environment variables.
The client is created lazily on first use to guarantee env vars are loaded.
"""
import os
import logging

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Ensure .env is loaded (no-op on Render where real env vars exist)
load_dotenv()

# ── Module-level state ──────────────────────────────────────────
_client = None
_initialised = False


def get_supabase():
    """
    Return a ready-to-use Supabase client.
    Creates it lazily on the first call using only (url, key) — no extra kwargs.
    Raises RuntimeError if credentials are missing or create_client() fails.
    """
    global _client, _initialised

    if _initialised and _client is not None:
        return _client

    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY", "")

    logger.info(f"[SUPABASE] SUPABASE_URL present: {bool(url)}")
    logger.info(f"[SUPABASE] SUPABASE_KEY present: {bool(key)}")

    if not url:
        raise RuntimeError(
            "SUPABASE_URL environment variable is not set. "
            "Add it in the Render dashboard → Environment → Environment Variables."
        )
    if not key:
        raise RuntimeError(
            "SUPABASE_KEY environment variable is not set. "
            "Add it in the Render dashboard → Environment → Environment Variables."
        )

    try:
        from supabase import create_client
        # ONLY pass url and key — no proxy, no options, no extra kwargs.
        _client = create_client(url, key)
        _initialised = True
        logger.info("[SUPABASE] Client initialized successfully.")
        return _client
    except Exception as e:
        logger.error(f"[SUPABASE] create_client() failed: {e}")
        raise RuntimeError(f"Failed to create Supabase client: {e}")
