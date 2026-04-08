"""
Document ingestion pipeline.

Flow:
  Upload PDF/text → save to data/{college_id}/ →
  load with LangChain loaders → split into chunks →
  embed with Gemini → store/update FAISS index at db/{college_id}/
"""

import os
import shutil
import tempfile
from pathlib import Path
from typing import List

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings
from app.utils import get_college_db_path, get_college_data_path, get_db_path

# ── Shared embeddings instance ──────────────────────────────────

_embeddings = None


def _get_embeddings() -> GoogleGenerativeAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = GoogleGenerativeAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
        )
    return _embeddings


# ── Text splitter ───────────────────────────────────────────────

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=settings.CHUNK_SIZE,
    chunk_overlap=settings.CHUNK_OVERLAP,
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""],
)


# ── Public API ──────────────────────────────────────────────────

async def ingest_file(college_id: str, file_path: str, filename: str) -> int:
    """
    Ingest a single file into the college's FAISS index.

    Returns the number of chunks processed.
    """
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

    chunks = _splitter.split_documents(documents)
    if not chunks:
        return 0

    embeddings = _get_embeddings()
    db_path = get_college_db_path(college_id)

    # Incremental: merge into existing index or create new
    if db_path.exists() and (db_path / "index.faiss").exists():
        vectorstore = FAISS.load_local(
            str(db_path), embeddings, allow_dangerous_deserialization=True
        )
        vectorstore.add_documents(chunks)
    else:
        db_path.mkdir(parents=True, exist_ok=True)
        vectorstore = FAISS.from_documents(chunks, embeddings)

    vectorstore.save_local(str(db_path))
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
    db_path = get_college_db_path(college_id)
    data_path = get_college_data_path(college_id)
    deleted = False
    if db_path.exists():
        shutil.rmtree(db_path)
        deleted = True
    if data_path.exists():
        shutil.rmtree(data_path)
        deleted = True
    return deleted


def list_colleges() -> List[dict]:
    """Return a list of colleges that have FAISS indices."""
    db_root = get_db_path()
    if not db_root.exists():
        return []

    colleges = []
    for entry in sorted(db_root.iterdir()):
        if entry.is_dir() and (entry / "index.faiss").exists():
            # Count source docs
            data_dir = get_college_data_path(entry.name)
            doc_count = len(list(data_dir.glob("*"))) if data_dir.exists() else 0
            colleges.append({
                "id": entry.name,
                "name": entry.name.replace("_", " ").replace("-", " ").title(),
                "doc_count": doc_count,
            })
    return colleges


async def create_db(path: str = "/var/data/db", college_id: str = "college_1"):
    """
    Creates an empty FAISS index at the specified path if it doesn't exist.
    """
    db_path = Path(path) / college_id
    if db_path.exists() and (db_path / "index.faiss").exists():
        return

    print(f"[INIT] Creating initial DB at {db_path}...")
    db_path.mkdir(parents=True, exist_ok=True)
    
    # We must have at least one document to initialize FAISS
    from langchain.schema import Document
    dummy_doc = Document(
        page_content="Initial DB for Render persistent storage.",
        metadata={"source": "system", "college_id": college_id}
    )
    
    embeddings = _get_embeddings()
    vectorstore = FAISS.from_documents([dummy_doc], embeddings)
    vectorstore.save_local(str(db_path))
    print(f"[INIT] DB created successfully at {db_path}")
