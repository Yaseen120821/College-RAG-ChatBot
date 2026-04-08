"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderPlus,
} from "lucide-react";
import { uploadDocuments } from "@/lib/api";

interface UploadedFile {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  message?: string;
}

export default function UploadPage() {
  const [collegeId, setCollegeId] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const accepted = Array.from(newFiles).filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ext === "pdf" || ext === "txt" || ext === "md";
    });
    setFiles((prev) => [
      ...prev,
      ...accepted.map((file) => ({ file, status: "pending" as const })),
    ]);
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!collegeId.trim() || files.length === 0) return;
    setUploading(true);
    setResult(null);

    try {
      const rawFiles = files.map((f) => f.file);
      const response = await uploadDocuments(collegeId.trim(), rawFiles);
      setResult({
        type: "success",
        message: `Successfully processed ${response.chunks_processed} chunks from ${response.files_processed} files for "${collegeId}".`,
      });
      setFiles([]);
    } catch (err: unknown) {
      setResult({
        type: "error",
        message: err instanceof Error ? err.message : "Upload failed. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Upload Documents</h1>
        <p className="text-gray-500 text-sm">
          Add PDFs, text files, or FAQs to build a college&apos;s knowledge base.
        </p>
      </div>

      {/* College ID input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          College ID
        </label>
        <div className="relative max-w-md">
          <FolderPlus
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            value={collegeId}
            onChange={(e) => setCollegeId(e.target.value)}
            placeholder="e.g., college_1, nit_delhi"
            className="w-full rounded-xl bg-white/[0.06] border border-white/10 pl-11 pr-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
          />
        </div>
        <p className="text-xs text-gray-600 mt-1.5">
          Use lowercase with underscores. Each college gets its own isolated knowledge base.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200 ${
          dragOver
            ? "border-violet-500 bg-violet-500/5"
            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
        }`}
      >
        <Upload
          size={40}
          className={`mx-auto mb-4 transition-colors ${
            dragOver ? "text-violet-400" : "text-gray-600"
          }`}
        />
        <p className="text-sm text-gray-300 mb-1 font-medium">
          Drag & drop files here
        </p>
        <p className="text-xs text-gray-600 mb-4">
          Supports PDF, TXT, and MD files
        </p>
        <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-gray-300 hover:bg-white/10 transition-colors cursor-pointer">
          <FileText size={14} />
          Browse Files
          <input
            type="file"
            multiple
            accept=".pdf,.txt,.md"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>
      </div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2"
          >
            {files.map((item, i) => (
              <motion.div
                key={`${item.file.name}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]"
              >
                <FileText size={16} className="text-violet-400 flex-shrink-0" />
                <span className="flex-1 text-sm text-gray-300 truncate">
                  {item.file.name}
                </span>
                <span className="text-xs text-gray-600">
                  {(item.file.size / 1024).toFixed(0)} KB
                </span>
                <button
                  onClick={() => removeFile(i)}
                  className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <X size={12} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={uploading || !collegeId.trim() || files.length === 0}
        className="mt-6 px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload size={16} />
            Upload & Build Index
          </>
        )}
      </button>

      {/* Result message */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-4 rounded-xl p-4 flex items-start gap-3 ${
              result.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20"
                : "bg-red-500/10 border border-red-500/20"
            }`}
          >
            {result.type === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
            )}
            <p
              className={`text-sm ${
                result.type === "success" ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {result.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
