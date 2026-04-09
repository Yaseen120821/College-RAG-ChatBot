"""
Application configuration — loads from environment variables.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Load .env from backend root
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class Settings:
    """Centralised application settings."""

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    FAISS_DB_DIR: str = os.getenv("FAISS_DB_DIR", "/var/data/db")
    DATA_DIR: str = os.getenv("DATA_DIR", "/var/data/data")
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
    print("[WARNING] GEMINI_API_KEY is missing! API calls will fail.")
