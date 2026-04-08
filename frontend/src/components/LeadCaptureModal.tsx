"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Loader2 } from "lucide-react";
import { db, id, isInstantDBConfigured } from "@/lib/db";

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  collegeId: string;
}

export default function LeadCaptureModal({
  isOpen,
  onClose,
  collegeId,
}: LeadCaptureModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [course, setCourse] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) return;
    setLoading(true);

    try {
      db.transact(
        db.tx.leads[id()].update({
          name: name.trim(),
          phone: phone.trim(),
          course: course.trim(),
          collegeId,
          createdAt: Date.now(),
        })
      );
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to save lead:", err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setName("");
    setPhone("");
    setCourse("");
    setSubmitted(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={reset}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md rounded-2xl bg-[hsl(230,25%,14%)] border border-white/10 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header gradient */}
            <div className="h-1.5 bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500" />

            <div className="p-6">
              {/* Close button */}
              <button
                onClick={reset}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-6"
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                    <UserPlus size={28} className="text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Thank You!</h3>
                  <p className="text-gray-400 text-sm">
                    Our admission team will contact you shortly.
                  </p>
                  <button
                    onClick={reset}
                    className="mt-6 px-6 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                  >
                    Close
                  </button>
                </motion.div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center">
                      <UserPlus size={20} className="text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Need Admission Help?</h3>
                      <p className="text-xs text-gray-500">We&apos;ll connect you with our team</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Name *"
                      className="w-full rounded-xl bg-white/[0.06] border border-white/10 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone Number *"
                      className="w-full rounded-xl bg-white/[0.06] border border-white/10 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    />
                    <input
                      type="text"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      placeholder="Course Interest (e.g., B.Tech CSE)"
                      className="w-full rounded-xl bg-white/[0.06] border border-white/10 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={loading || !name.trim() || !phone.trim()}
                    className="w-full mt-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <UserPlus size={16} />
                        Submit
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
