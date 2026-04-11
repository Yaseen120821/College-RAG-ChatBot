"""
Supabase client initialisation.

Reads SUPABASE_URL and SUPABASE_KEY from the environment (via config.settings).
If either is missing, the client is set to None and a warning is logged.
All modules must check `if supabase is None` before using the client.
"""
import logging
from supabase import create_client, Client
from app.config import settings

logger = logging.getLogger(__name__)

supabase: Client | None = None

_url = settings.SUPABASE_URL
_key = settings.SUPABASE_KEY

if _url and _key:
    try:
        supabase = create_client(_url, _key)
        logger.info("[SUPABASE] Client initialized successfully.")
    except Exception as e:
        logger.error(f"[SUPABASE] Failed to create client: {e}")
        supabase = None
else:
    missing = []
    if not _url:
        missing.append("SUPABASE_URL")
    if not _key:
        missing.append("SUPABASE_KEY")
    logger.warning(f"[SUPABASE] Missing environment variable(s): {', '.join(missing)}. Client not initialized.")
