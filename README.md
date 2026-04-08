# Admission RAG Chatbot Platform

AI-powered chatbot for college admission queries using Retrieval-Augmented Generation (RAG) with Google Gemini.

## Architecture

```
User → Next.js Frontend (Vercel) → FastAPI Backend (Render) → FAISS + Gemini → InstantDB
```

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt

# Set your Gemini API key
cp .env.example .env  # edit with your key

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Set environment variables
cp .env.local.example .env.local  # edit with your values

# Run dev server
npm run dev
```

### Ingest Sample Data

```bash
curl -X POST http://localhost:8000/ingest \
  -F "college_id=college_1" \
  -F "files=@data/sample_admission_brochure.txt"
```

### Test Chat

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"college_id": "college_1", "question": "What is the fee for B.Tech?"}'
```

## Environment Variables

### Backend (`.env`)

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google AI Studio API key |
| `ALLOWED_ORIGINS` | ❌ | CORS origins (comma-separated) |
| `FAISS_DB_DIR` | ❌ | Path to FAISS indices (default: `./db`) |
| `DATA_DIR` | ❌ | Path to raw documents (default: `./data`) |

### Frontend (`.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL |
| `NEXT_PUBLIC_INSTANTDB_APP_ID` | ✅ | InstantDB App ID |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/chat` | Send admission query |
| `POST` | `/ingest` | Upload documents |
| `DELETE` | `/ingest/{college_id}` | Remove college data |
| `GET` | `/colleges` | List active colleges |
| `GET` | `/health` | Health check |

## Deployment

### Backend → Render
- Docker web service
- Set `GEMINI_API_KEY` env var
- Mount persistent disk at `/app/db`

### Frontend → Vercel
- Auto-detected Next.js
- Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_INSTANTDB_APP_ID`

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS, Framer Motion, Lucide React
- **Backend**: Python, FastAPI, LangChain, FAISS, Google Gemini
- **Database**: InstantDB (auth + realtime)
- **Deployment**: Vercel + Render
