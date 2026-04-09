"""
RAG query engine — retrieval + Gemini LLM generation.
"""

from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from typing import Dict, List, Optional, Any, Tuple

from app.config import settings
from app.utils import (
    get_college_db_path,
    get_db_path,
    is_admission_related,
    REJECTION_RESPONSE,
    FALLBACK_RESPONSE,
)

# ── System prompt ───────────────────────────────────────────────

_SYSTEM_TEMPLATE = """You are a knowledgeable and helpful college admission assistant.

STRICT RULES — you MUST follow every single one:
1. Answer ONLY using the provided context below.
2. Do NOT make up, guess, or hallucinate any information.
3. If the answer is not found in the context, respond exactly with:
   "I don't have that specific information right now. Please contact the admission office directly for the most accurate details."
4. If the question is not related to admissions, courses, fees, eligibility, scholarships, or the application process, respond exactly with:
   "I can only help with admission-related queries. Please ask me about admissions, courses, fees, eligibility, or the application process."
5. Keep your answers concise, accurate, and student-friendly.
6. When mentioning fees or dates, be precise — quote the exact figures from the context.
7. Format your answers with proper structure when appropriate (use bullet points for lists).

Context:
{context}

Question: {question}

Answer:"""

_PROMPT = PromptTemplate(
    template=_SYSTEM_TEMPLATE,
    input_variables=["context", "question"],
)

# ── Cached components ───────────────────────────────────────────

_embeddings = None
_llm = None
_vectorstores_cache = {}

import logging
logger = logging.getLogger(__name__)

def _get_embeddings() -> GoogleGenerativeAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set.")
        _embeddings = GoogleGenerativeAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
        )
    return _embeddings


def _get_llm() -> ChatGoogleGenerativeAI:
    global _llm
    if _llm is None:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set.")
        _llm = ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0,
            convert_system_message_to_human=True,
        )
    return _llm


# ── Public API ──────────────────────────────────────────────────

async def query(college_id: str, question: str) -> Dict[str, Any]:
    """
    Run the RAG pipeline for a given college and question.

    Returns:
        {
            "answer": str,
            "sources": List[str],
            "answered": bool   # False if fallback/rejection
        }
    """
    # 1. Domain filter — fast rejection without LLM call
    if not is_admission_related(question):
        return {
            "answer": REJECTION_RESPONSE,
            "sources": [],
            "answered": False,
        }

    # 2. Check memory cache or load the college's FAISS index.
    db_path = get_college_db_path(college_id)
    embeddings = _get_embeddings()

    if college_id in _vectorstores_cache:
        logger.info(f"[RAG] Using cached FAISS index for {college_id}")
        vectorstore = _vectorstores_cache[college_id]
    else:
        logger.info(f"[RAG] Loading FAISS index from disk for {college_id} at /var/data/db")
        
        # Load from /var/data/db
        if not db_path.exists() or not (db_path / "index.faiss").exists():
            logger.warning(f"[STORAGE ERROR] DB path missing ({db_path}). Attempting initialization.")
            from app.ingest import create_db
            try:
                await create_db(path="/var/data/db", college_id=college_id)
            except Exception as e:
                logger.error(f"[RAG] Error creating DB: {e}")
        
        # Check again if initialization succeeded
        if db_path.exists() and (db_path / "index.faiss").exists():
            try:
                vectorstore = FAISS.load_local(
                    str(db_path), embeddings, allow_dangerous_deserialization=True
                )
            except Exception as e:
                logger.error(f"[RAG] Local FAISS file corrupted: {e}. Attempting clean rebuild...")
                # Re-try entirely
                from app.ingest import create_db, delete_college_index
                logger.info(f"[STORAGE] Rebuilding DB automatically for {college_id}...")
                delete_college_index(college_id)
                try:
                    await create_db(path="/var/data/db", college_id=college_id)
                    if db_path.exists() and (db_path / "index.faiss").exists():
                        vectorstore = FAISS.load_local(
                            str(db_path), embeddings, allow_dangerous_deserialization=True
                        )
                        logger.info(f"[STORAGE] DB reloaded perfectly for {college_id}.")
                    else:
                        raise ValueError("Rebuild produced no data.")
                except Exception as recreate_err:
                    logger.error(f"[RAG] Error recreating DB: {recreate_err}")
                    return {
                        "answer": "Error loading admission data. Please contact the administration.",
                        "sources": [],
                        "answered": False,
                    }
        else:
             return {
                "answer": "No admission data has been uploaded for this college yet. Please contact the administration.",
                "sources": [],
                "answered": False,
            }

        _vectorstores_cache[college_id] = vectorstore

    # 3. Build retrieval chain
    retriever = vectorstore.as_retriever(
        search_kwargs={"k": settings.RETRIEVER_K}
    )

    chain = RetrievalQA.from_chain_type(
        llm=_get_llm(),
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True,
        chain_type_kwargs={"prompt": _PROMPT},
    )

    # 4. Run the chain
    try:
        result = chain.invoke({"query": question})
    except Exception as e:
        logger.error(f"[RAG ERROR] {e}")
        return {
            "answer": FALLBACK_RESPONSE,
            "sources": [],
            "answered": False,
        }

    answer_text = result.get("result", FALLBACK_RESPONSE)
    source_docs = result.get("source_documents", [])
    sources = list({doc.metadata.get("source", "unknown") for doc in source_docs})

    # 5. Check if the LLM itself signaled "not found"
    answered = True
    lower_answer = answer_text.lower()
    if "contact the admission office" in lower_answer or "i don't have" in lower_answer:
        answered = False

    return {
        "answer": answer_text,
        "sources": sources,
        "answered": answered,
    }

def invalidate_cache(college_id: str):
    """Clear memory cache when new documents are ingested."""
    if college_id in _vectorstores_cache:
        del _vectorstores_cache[college_id]
        logger.info(f"[RAG] Cache invalidated for {college_id}")
