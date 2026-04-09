"""
FastAPI application — Admission RAG Chatbot Backend.

Endpoints:
  POST /chat      — Ask an admission question
  POST /ingest    — Upload documents to a college's knowledge base
  DELETE /ingest/{college_id} — Remove a college's index
  GET  /colleges  — List colleges with data
  GET  /health    — Health check
"""
from __future__ import annotations

import traceback
import logging
from typing import List

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Safe imports — these modules are designed not to crash at import time
from app.config import settings
from app.utils import validate_college_id

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

print("Server starting...")

# ── App ─────────────────────────────────────────────────────────

app = FastAPI(
    title="Admission RAG Chatbot API",
    description="AI-powered admission query engine using RAG with Gemini.",
    version="1.0.0",
)

@app.on_event("startup")
async def startup_event():
    """Build FAISS indexes in memory from Supabase on startup to avoid startup delays for the first user."""
    from app.ingest import list_colleges, create_db
    from app.rag import _vectorstores_cache

    logger.info("[STARTUP] Initializing RAG memory cache from Supabase...")
    try:
        colleges = list_colleges()
        if not colleges:
            logger.info("[STARTUP] No documents found in Supabase. Awaiting ingress.")
        else:
            for college in colleges:
                cid = college["id"]
                logger.info(f"[STARTUP] Building FAISS for {cid}...")
                vectorstore = await create_db(college_id=cid)
                if vectorstore:
                    _vectorstores_cache[cid] = vectorstore
            logger.info("[STARTUP] RAG caching complete.")
    except Exception as e:
        logger.error(f"[STARTUP] Startup initialization error: {e}")
        logger.error(traceback.format_exc())

# ── CORS ────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schemas ─────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    college_id: str = Field(..., min_length=1, max_length=64)
    question: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    answer: str
    sources: List[str] = []
    answered: bool = True


class IngestResponse(BaseModel):
    status: str
    college_id: str
    chunks_processed: int
    files_processed: int


class HealthResponse(BaseModel):
    status: str
    version: str


class CollegeInfo(BaseModel):
    id: str
    name: str
    doc_count: int


# ── Endpoints ───────────────────────────────────────────────────


@app.get("/", tags=["System"])
def root():
    """Root endpoint for Render port detection and health check."""
    return {"status": "running"}


@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Return API health status."""
    return HealthResponse(status="ok", version="1.0.0")


@app.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(request: ChatRequest):
    """
    Send an admission-related question and get an AI-generated answer
    grounded in the college's uploaded documents.
    """
    logger.info(f"[CHAT] Received request for college_id: {request.college_id}")
    if not validate_college_id(request.college_id):
        raise HTTPException(status_code=400, detail="Invalid college_id format.")

    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Gemini API key is missing. Set GEMINI_API_KEY in environment.")

    try:
        from app.rag import query as rag_query
        result = await rag_query(request.college_id, request.question.strip())
        logger.info(f"[CHAT] Request processed successfully for {request.college_id}")
        return ChatResponse(**result)
    except Exception as e:
        logger.error(f"[CHAT ERROR] Exception: {e}")
        logger.error(traceback.format_exc())
        if "API_KEY" in str(e) or "API key" in str(e):
            raise HTTPException(status_code=503, detail="Gemini API key is invalid or not configured correctly.")
        raise HTTPException(status_code=500, detail=f"An error occurred processing your query: {str(e)}")


@app.post("/ingest", response_model=IngestResponse, tags=["Ingestion"])
async def ingest_documents(
    college_id: str = Form(...),
    files: List[UploadFile] = File(...),
):
    """
    Upload PDF or text files to build/update a college's knowledge base.
    """
    logger.info(f"[INGEST] Incoming ingestion for college_id: {college_id}")
    if not validate_college_id(college_id):
        raise HTTPException(status_code=400, detail="Invalid college_id format.")

    total_chunks = 0
    processed = 0

    for upload_file in files:
        if not upload_file.filename:
            continue
        ext = upload_file.filename.rsplit(".", 1)[-1].lower() if "." in upload_file.filename else ""
        if ext not in ("pdf", "txt", "md"):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: .{ext}. Allowed: .pdf, .txt, .md",
            )

        file_bytes = await upload_file.read()
        try:
            from app.ingest import ingest_uploaded_bytes
            chunks = await ingest_uploaded_bytes(college_id, file_bytes, upload_file.filename)
            logger.info(f"[INGEST] Processed {chunks} chunks from {upload_file.filename}")
        except Exception as e:
            logger.error(f"[INGEST ERROR] {e}")
            logger.error(traceback.format_exc())
            if "API_KEY" in str(e) or "API key" in str(e):
                raise HTTPException(status_code=503, detail="Gemini API key is invalid or not configured correctly.")
            raise HTTPException(status_code=500, detail=f"Failed to process {upload_file.filename}: {str(e)}")
        total_chunks += chunks
        processed += 1

    return IngestResponse(
        status="success",
        college_id=college_id,
        chunks_processed=total_chunks,
        files_processed=processed,
    )


@app.delete("/ingest/{college_id}", tags=["Ingestion"])
async def delete_index(college_id: str):
    """Remove all documents and the FAISS index for a college."""
    logger.info(f"[INGEST] Deleting index for college_id: {college_id}")
    if not validate_college_id(college_id):
        raise HTTPException(status_code=400, detail="Invalid college_id format.")

    from app.ingest import delete_college_index
    deleted = delete_college_index(college_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="No data found for this college.")

    return {"status": "deleted", "college_id": college_id}


@app.get("/colleges", response_model=List[CollegeInfo], tags=["Colleges"])
async def get_colleges():
    """List all colleges that have ingested documents."""
    from app.ingest import list_colleges
    return list_colleges()
