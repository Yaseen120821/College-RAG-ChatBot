"""
Application configuration — loads from environment variables.
"""
from __future__ import annotations

import os
import logging
from pathlib import Path
from typing import List

logger = logging.getLogger(__name__)

# Load .env from backend root (safe if python-dotenv is not installed)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    logger.info("[CONFIG] python-dotenv not installed, skipping .env file loading.")
except Exception as e:
    logger.warning(f"[CONFIG] Could not load .env file: {e}")


class Settings:
    """Centralised application settings."""

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    FAISS_DB_DIR: str = os.getenv("FAISS_DB_DIR", "/tmp/db")
    DATA_DIR: str = os.getenv("DATA_DIR", "/tmp/documents")
    ALLOWED_ORIGINS: List[str] = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")

    # Embedding & LLM model names
    EMBEDDING_MODEL: str = "models/embedding-001"
    LLM_MODEL: str = "gemini-1.5-flash"

    # RAG tuning
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    RETRIEVER_K: int = 3


settings = Settings()

if not settings.GEMINI_API_KEY:
    print("[WARNING] GEMINI_API_KEY is missing! API calls will fail — but the server will still start.")
