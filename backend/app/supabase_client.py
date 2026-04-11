"""
Supabase client — lazy initialisation.

The client is created on first use (not at import time) to guarantee that
environment variables from Render / .env are fully loaded before we call
create_client().

Usage in other modules:
    from app.supabase_client import get_supabase
    sb = get_supabase()          # returns Client or raises RuntimeError
    sb.table("documents")...

Legacy alias kept for backward compatibility:
    from app.supabase_client import supabase   # may be None before first call
"""
import os
import logging

from dotenv import load_dotenv
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Ensure .env is loaded (no-op on Render where real env vars exist)
load_dotenv()

# ── Module-level state ──────────────────────────────────────────
_client: Client | None = None
_initialised: bool = False


def get_supabase() -> Client:
    """
    Return a ready-to-use Supabase client.
    Creates it lazily on the first call.
    Raises RuntimeError with a clear message if credentials are missing
    or if create_client() fails.
    """
    global _client, _initialised

    if _initialised and _client is not None:
        return _client

    # Read directly from os.getenv — the single source of truth on Render.
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
        _client = create_client(url, key)
        _initialised = True
        logger.info("[SUPABASE] Client initialized successfully.")
        return _client
    except Exception as e:
        logger.error(f"[SUPABASE] create_client() failed: {e}")
        raise RuntimeError(
            f"Failed to create Supabase client: {e}. "
            "Verify that SUPABASE_URL is your project URL (https://xxx.supabase.co) "
            "and SUPABASE_KEY is the anon/service_role key (starts with 'eyJ...')."
        )


# ── Backward-compatible alias ───────────────────────────────────
# Other modules do `from app.supabase_client import supabase`.
# This property-via-module trick isn't needed — we just expose a simple
# reference that gets populated on first get_supabase() call.
# Modules should migrate to get_supabase(), but this keeps them working.
supabase: Client | None = None


def _ensure_legacy_alias():
    """Populate the module-level `supabase` alias."""
    global supabase
    try:
        supabase = get_supabase()
    except RuntimeError:
        supabase = None


# Try once at import time (best-effort), but don't crash the server.
try:
    _ensure_legacy_alias()
except Exception as e:
    logger.warning(f"[SUPABASE] Deferred initialization (will retry on first request): {e}")
