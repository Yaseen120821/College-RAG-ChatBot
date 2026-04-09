import os
from supabase import create_client, Client
from app.config import settings
import logging

logger = logging.getLogger(__name__)

url = settings.SUPABASE_URL
key = settings.SUPABASE_KEY

# Only create client if credentials exist, otherwise let the startup warn
if url and key:
    supabase: Client = create_client(url, key)
else:
    logger.warning("[SUPABASE] SUPABASE_URL or SUPABASE_KEY is missing!")
    supabase = None
