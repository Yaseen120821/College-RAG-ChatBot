"""
RAG query engine — retrieval + Gemini LLM generation.
"""

from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

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


def _get_embeddings() -> GoogleGenerativeAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = GoogleGenerativeAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
        )
    return _embeddings


def _get_llm() -> ChatGoogleGenerativeAI:
    global _llm
    if _llm is None:
        _llm = ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0,
            convert_system_message_to_human=True,
        )
    return _llm


# ── Public API ──────────────────────────────────────────────────

async def query(college_id: str, question: str) -> dict:
    """
    Run the RAG pipeline for a given college and question.

    Returns:
        {
            "answer": str,
            "sources": list[str],
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

    # 2. Load the college's FAISS index. If missing or broken, auto-create.
    db_path = get_college_db_path(college_id)
    embeddings = _get_embeddings()
    vectorstore = None

    if not db_path.exists() or not (db_path / "index.faiss").exists():
        print(f"[RAG] DB path missing ({db_path}). Triggering DB creation.")
        from app.ingest import create_db
        try:
            await create_db(path=str(get_db_path()), college_id=college_id)
            vectorstore = FAISS.load_local(
                str(db_path), embeddings, allow_dangerous_deserialization=True
            )
        except Exception as e:
            print(f"[RAG] Error creating DB: {e}")
            return {
                "answer": "No admission data has been uploaded for this college yet. Please contact the administration.",
                "sources": [],
                "answered": False,
            }
    else:
        try:
            vectorstore = FAISS.load_local(
                str(db_path), embeddings, allow_dangerous_deserialization=True
            )
        except Exception as e:
            print(f"[RAG] Failed to load DB: {e}. Recreating DB...")
            from app.ingest import create_db
            try:
                await create_db(path=str(get_db_path()), college_id=college_id)
                vectorstore = FAISS.load_local(
                    str(db_path), embeddings, allow_dangerous_deserialization=True
                )
            except Exception as recreate_err:
                print(f"[RAG] Error recreating DB: {recreate_err}")
                return {
                    "answer": "Error loading admission data. Please contact the administration.",
                    "sources": [],
                    "answered": False,
                }

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
        print(f"[RAG ERROR] {e}")
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
