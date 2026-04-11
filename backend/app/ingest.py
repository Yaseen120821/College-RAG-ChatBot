"""
Document ingestion pipeline.

Flow:
  Upload PDF/text → extract chunks → Insert to Supabase → rebuild memory FAISS cache
"""
from __future__ import annotations

import os
import tempfile
import logging
from pathlib import Path
from typing import Any, Dict, List

from app.config import settings

logger = logging.getLogger(__name__)

# ── Lazy helpers ────────────────────────────────────────────────

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
    Ingest a single file: extract text, chunk, and insert into Supabase.
    Then invalidate memory cache.
    """
    from langchain_community.document_loaders import PyPDFLoader, TextLoader
    from app.supabase_client import get_supabase
    from app.rag import invalidate_cache

    client = get_supabase()

    # Pick the correct loader
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        loader = PyPDFLoader(file_path)
    elif ext in (".txt", ".md"):
        loader = TextLoader(file_path, encoding="utf-8")
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    documents = loader.load()
    splitter = _get_splitter()
    chunks = splitter.split_documents(documents)
    if not chunks:
        return 0

    # Insert chunks into Supabase
    rows_to_insert = []
    for chunk in chunks:
        metadata = {
            "source": filename,
            "college_id": college_id,
            **chunk.metadata
        }
        rows_to_insert.append({
            "content": chunk.page_content,
            "metadata": metadata
        })

    try:
        res = client.table("documents").insert(rows_to_insert).execute()
        logger.info(f"[INGEST] Saved {len(res.data)} chunks to Supabase for {college_id}")
    except Exception as e:
        logger.error(f"[INGEST] Supabase insert failed: {e}")
        raise

    invalidate_cache(college_id)
    return len(chunks)


async def ingest_uploaded_bytes(
    college_id: str,
    file_bytes: bytes,
    filename: str,
) -> int:
    """
    Convenience wrapper: save uploaded bytes to a temp file, then ingest to Supabase.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        return await ingest_file(college_id, tmp_path, filename)
    finally:
        os.unlink(tmp_path)


def delete_college_index(college_id: str) -> bool:
    """Remove a college's documents from Supabase and invalidate cache."""
    from app.supabase_client import get_supabase
    from app.rag import invalidate_cache

    try:
        client = get_supabase()
    except RuntimeError as e:
        logger.warning(f"[INGEST] Supabase client unavailable: {e}")
        return False

    logger.info(f"[INGEST] Deleting documents for college_id: {college_id}")
    try:
        # Note: metadata->>'college_id' is the jsonb extraction path.
        res = client.table("documents").delete().eq("metadata->>college_id", college_id).execute()
        deleted_count = len(res.data)
        logger.info(f"[INGEST] Deleted {deleted_count} rows from Supabase.")
        invalidate_cache(college_id)
        return deleted_count > 0
    except Exception as e:
        logger.error(f"[INGEST] Supabase delete failed: {e}")
        return False


def list_colleges() -> List[Dict[str, Any]]:
    """Return a list of colleges by aggregating documents in Supabase."""
    from app.supabase_client import get_supabase

    try:
        client = get_supabase()
    except RuntimeError:
        return []

    try:
        # Fetching specific fields to group manually
        res = client.table("documents").select("metadata").execute()
    except Exception as e:
        logger.error(f"[INGEST] Supabase select failed: {e}")
        return []

    counts = {}
    for row in res.data:
        meta = row.get("metadata", {})
        cid = meta.get("college_id")
        if cid:
            counts[cid] = counts.get(cid, 0) + 1

    colleges = []
    for cid, doc_count in counts.items():
        colleges.append({
            "id": cid,
            "name": cid.replace("_", " ").replace("-", " ").title(),
            "doc_count": doc_count,
        })
    return sorted(colleges, key=lambda x: x["id"])


async def create_db(college_id: str = "college_1"):
    """
    Fetch documents from Supabase and return an in-memory FAISS vectorstore.
    If Supabase is empty, this returns None.
    """
    from langchain_community.vectorstores import FAISS
    from langchain.docstore.document import Document
    from app.supabase_client import get_supabase

    try:
        client = get_supabase()
    except RuntimeError as e:
        logger.warning(f"[STORAGE] Supabase unavailable, cannot rebuild DB: {e}")
        return None

    logger.info(f"[STORAGE] Fetching documents from Supabase for {college_id}")
    try:
        res = client.table("documents").select("content, metadata").eq("metadata->>college_id", college_id).execute()
    except Exception as e:
        logger.error(f"[STORAGE] Supabase select failed: {e}")
        return None

    if not res.data:
        logger.warning(f"[INIT] No documents found in Supabase for {college_id}.")
        return None

    logger.info(f"[INIT] Found {len(res.data)} chunks for {college_id}. Rebuilding in-memory FAISS...")

    docs = []
    for row in res.data:
        docs.append(Document(page_content=row["content"], metadata=row.get("metadata", {})))

    embeddings = _get_embeddings()
    vectorstore = FAISS.from_documents(docs, embeddings)
    
    logger.info(f"[INIT] FAISS rebuild complete for {college_id}.")
    return vectorstore
