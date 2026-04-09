"""
Document ingestion pipeline.

Flow:
  Upload PDF/text → save to data/{college_id}/ →
  load with LangChain loaders → split into chunks →
  embed with Gemini → store/update FAISS index at db/{college_id}/
"""
from __future__ import annotations

import os
import shutil
import tempfile
import logging
from pathlib import Path
from typing import Any, Dict, List

from app.config import settings
from app.utils import get_college_db_path, get_college_data_path, get_db_path

logger = logging.getLogger(__name__)

# ── Lazy helpers ────────────────────────────────────────────────
# All heavy ML imports happen inside functions, not at module level,
# so that an import-time failure doesn't prevent the FastAPI app from
# starting (Render will then show a clear runtime error instead of
# crashing with exit code 1).

_embeddings = None
_splitter = None


def _get_embeddings():
    global _embeddings
    if _embeddings is None:
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set.")
        _embeddings = GoogleGenerativeAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
        )
    return _embeddings


def _get_splitter():
    global _splitter
    if _splitter is None:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        _splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
    return _splitter


# ── Public API ──────────────────────────────────────────────────

async def ingest_file(college_id: str, file_path: str, filename: str) -> int:
    """
    Ingest a single file into the college's FAISS index.

    Returns the number of chunks processed.
    """
    from langchain_community.document_loaders import PyPDFLoader, TextLoader
    from langchain_community.vectorstores import FAISS
    from app.rag import invalidate_cache

    # Pick the correct loader
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        loader = PyPDFLoader(file_path)
    elif ext in (".txt", ".md"):
        loader = TextLoader(file_path, encoding="utf-8")
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    # Load & split
    documents = loader.load()
    # Add metadata
    for doc in documents:
        doc.metadata["source"] = filename
        doc.metadata["college_id"] = college_id

    splitter = _get_splitter()
    chunks = splitter.split_documents(documents)
    if not chunks:
        return 0

    embeddings = _get_embeddings()
    db_path = get_college_db_path(college_id)

    # Incremental: merge into existing index or create new
    if db_path.exists() and (db_path / "index.faiss").exists():
        logger.info(f"[INGEST] Loading existing index for append: {db_path}")
        vectorstore = FAISS.load_local(
            str(db_path), embeddings, allow_dangerous_deserialization=True
        )
        vectorstore.add_documents(chunks)
    else:
        logger.info(f"[INGEST] Creating new FAISS index at: {db_path}")
        db_path.mkdir(parents=True, exist_ok=True)
        vectorstore = FAISS.from_documents(chunks, embeddings)

    vectorstore.save_local(str(db_path))
    invalidate_cache(college_id)  # Remove old version from loaded memory cache
    logger.info(f"[INGEST] Saved {len(chunks)} chunks to {db_path}")

    return len(chunks)


async def ingest_uploaded_bytes(
    college_id: str,
    file_bytes: bytes,
    filename: str,
) -> int:
    """
    Convenience wrapper: save uploaded bytes to a temp file,
    persist a copy in data/{college_id}/, then ingest.
    """
    # Persist raw file for future reference
    data_dir = get_college_data_path(college_id)
    data_dir.mkdir(parents=True, exist_ok=True)
    dest = data_dir / filename
    dest.write_bytes(file_bytes)

    # Use temp copy for loader (some loaders need seekable files)
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        return await ingest_file(college_id, tmp_path, filename)
    finally:
        os.unlink(tmp_path)


def delete_college_index(college_id: str) -> bool:
    """Remove a college's entire FAISS index and data folder."""
    from app.rag import invalidate_cache

    db_path = get_college_db_path(college_id)
    data_path = get_college_data_path(college_id)
    deleted = False

    logger.info(f"[INGEST] Deleting index for college_id: {college_id}")
    if db_path.exists():
        shutil.rmtree(db_path)
        invalidate_cache(college_id)
        deleted = True
    if data_path.exists():
        shutil.rmtree(data_path)
        deleted = True
    return deleted


def list_colleges() -> List[Dict[str, Any]]:
    """Return a list of colleges that have FAISS indices."""
    db_root = get_db_path()
    if not db_root.exists():
        return []

    colleges: List[Dict[str, Any]] = []
    for entry in sorted(db_root.iterdir()):
        if entry.is_dir() and (entry / "index.faiss").exists():
            data_dir = get_college_data_path(entry.name)
            doc_count = len(list(data_dir.glob("*"))) if data_dir.exists() else 0
            colleges.append({
                "id": entry.name,
                "name": entry.name.replace("_", " ").replace("-", " ").title(),
                "doc_count": doc_count,
            })
    return colleges


async def create_db(path: str = "/tmp/db", college_id: str = "college_1"):
    """
    Intelligent initialization function. Checks if db exists.
    If not, it checks `backend/data/` to perform automatic rebuild.
    """
    logger.info(f"[STORAGE] DB Creation invoked for {college_id} at {path}")
    db_path = Path(path) / college_id
    if db_path.exists() and (db_path / "index.faiss").exists():
        logger.info(f"[STORAGE] DB already exists at {db_path}. Skipping creation.")
        return

    logger.info(f"[INIT] DB missing at {db_path}. Checking for existing documents...")

    docs_path = Path(__file__).resolve().parent.parent / "data" / college_id
    if not docs_path.exists() or not list(docs_path.glob("*")):
        logger.warning(f"[INIT] No documents found in {docs_path}. Skipping automatic DB creation.")
        return

    logger.info(f"[INIT] Existing documents found in {docs_path}. Initiating automatic ingestion rebuild...")

    target_docs_path = get_college_data_path(college_id)
    target_docs_path.mkdir(parents=True, exist_ok=True)
    
    # Copy all files over so they are counted in /colleges
    for file_path in docs_path.glob("*"):
        if file_path.is_file():
            shutil.copy2(file_path, target_docs_path / file_path.name)

    # Loop over copied files and ingest to bootstrap the index natively
    for file_path in target_docs_path.glob("*"):
        if file_path.is_file():
            try:
                # Need to read as bytes to pass through convenience ingest logic
                await ingest_file(college_id, str(file_path), file_path.name)
                logger.info(f"[INIT] Automatically ingested {file_path.name} into {college_id}")
            except Exception as e:
                logger.error(f"[INIT ERROR] Failed automatic ingestion for {file_path.name}: {e}")

    logger.info(f"[INIT] Automatic initialization finished for {college_id}.")
