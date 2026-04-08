/**
 * Backend API client.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ChatResponse {
  answer: string;
  sources: string[];
  answered: boolean;
}

export interface CollegeInfo {
  id: string;
  name: string;
  doc_count: number;
}

export interface IngestResponse {
  status: string;
  college_id: string;
  chunks_processed: number;
  files_processed: number;
}

/**
 * Send a chat question to the RAG backend.
 */
export async function sendChatMessage(
  collegeId: string,
  question: string
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ college_id: collegeId, question }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch the list of colleges with data.
 */
export async function fetchColleges(): Promise<CollegeInfo[]> {
  const res = await fetch(`${API_BASE}/colleges`);
  if (!res.ok) throw new Error(`Failed to fetch colleges: ${res.status}`);
  return res.json();
}

/**
 * Upload documents for a college.
 */
export async function uploadDocuments(
  collegeId: string,
  files: File[]
): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append("college_id", collegeId);
  files.forEach((file) => formData.append("files", file));

  const res = await fetch(`${API_BASE}/ingest`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Delete a college's index.
 */
export async function deleteCollegeIndex(collegeId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/ingest/${collegeId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Delete failed: ${res.status}`);
  }
}

/**
 * Health check.
 */
export async function checkHealth(): Promise<{ status: string; version: string }> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
