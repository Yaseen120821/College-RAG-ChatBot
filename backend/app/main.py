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

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List

from app.config import settings
from app.rag import query as rag_query
from app.ingest import ingest_uploaded_bytes, delete_college_index, list_colleges
from app.utils import validate_college_id, get_db_path, init_storage

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── App ─────────────────────────────────────────────────────────

app = FastAPI(
    title="Admission RAG Chatbot API",
    description="AI-powered admission query engine using RAG with Gemini.",
    version="1.0.0",
)

@app.on_event("startup")
async def startup_event():
    """First-Time Initialization Logic for Render Disk Deployment."""
    logger.info("[STARTUP] Executing init_storage() macro...")
    init_storage()
    
    db_root = get_db_path()
    logger.info(f"[STARTUP] Environment paths - DB: {db_root}, DATA: /var/data/documents")
    
    if not db_root.exists():
        logger.info(f"[STARTUP] Render Disk DB path '{db_root}' missing. Triggering auto-ingestion...")
        from app.ingest import create_db
        try:
            # Create a default DB structure so that RAG queries do not crash on first load
            await create_db(path=str(db_root), college_id="college_1")
            logger.info("[STARTUP] Auto-ingestion complete.")
        except Exception as e:
            logger.error(f"[STARTUP] Error creating initial DB: {e}")
    else:
        logger.info(f"[STARTUP] Render Disk DB path '{db_root}' exists. Ready to serve.")

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
    college_id: str = Field(..., min_length=1, max_length=64, example="college_1")
    question: str = Field(..., min_length=1, max_length=2000, example="What is the fee for B.Tech?")


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
    """Root endpoint for Render port detection."""
    return {"status": "ok"}


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

    deleted = delete_college_index(college_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="No data found for this college.")

    return {"status": "deleted", "college_id": college_id}


@app.get("/colleges", response_model=List[CollegeInfo], tags=["Colleges"])
async def get_colleges():
    """List all colleges that have ingested documents."""
    return list_colleges()
