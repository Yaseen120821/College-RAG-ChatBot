"""
Application configuration — loads from environment variables.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend root
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class Settings:
    """Centralised application settings."""

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    FAISS_DB_DIR: str = os.getenv("FAISS_DB_DIR", str(Path(__file__).resolve().parent.parent / "db"))
    DATA_DIR: str = os.getenv("DATA_DIR", str(Path(__file__).resolve().parent.parent / "data"))
    ALLOWED_ORIGINS: list[str] = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")

    # Embedding & LLM model names
    EMBEDDING_MODEL: str = "models/embedding-001"
    LLM_MODEL: str = "gemini-pro"

    # RAG tuning
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    RETRIEVER_K: int = 4


settings = Settings()
