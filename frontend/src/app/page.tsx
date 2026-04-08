"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Shield, Zap, Building2, ArrowRight, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import CollegeSelector from "@/components/CollegeSelector";
import { fetchColleges, CollegeInfo } from "@/lib/api";

const features = [
  {
    icon: Zap,
    title: "Instant Answers",
    description: "Get accurate responses to your admission queries in seconds using AI.",
  },
  {
    icon: Shield,
    title: "Verified Data Only",
    description: "Responses are grounded in official college documents — no hallucinations.",
  },
  {
    icon: Building2,
    title: "Multi-College Support",
    description: "Access admission info for multiple colleges, each with its own knowledge base.",
  },
];

export default function HomePage() {
  const [colleges, setColleges] = useState<CollegeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchColleges()
      .then(setColleges)
      .catch((err) => console.error("Failed to load colleges:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen grid-pattern">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium mb-6">
              <Sparkles size={14} />
              Powered by Google Gemini AI
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
              <span className="text-white">Your AI </span>
              <span className="gradient-text">Admission Assistant</span>
            </h1>

            <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
              Get instant, accurate answers about fees, eligibility, scholarships,
              and the application process — all powered by your college&apos;s own documents.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.a
                href="/chat"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 transition-shadow"
              >
                <MessageCircle size={18} />
                Start Chatting
                <ArrowRight size={16} />
              </motion.a>
              <motion.a
                href="/admin"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-colors"
              >
                Admin Dashboard
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold text-white mb-3">
              Why Use Our Chatbot?
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Built with cutting-edge RAG technology to ensure every answer is accurate and helpful.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] p-7 hover:bg-white/[0.06] hover:border-violet-500/20 transition-all duration-300"
              >
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/5 rounded-full blur-3xl group-hover:bg-violet-500/10 transition-all duration-500" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center mb-5">
                    <feature.icon size={22} className="text-violet-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── College selector ──────────────────────────── */}
      <section className="py-20 px-4 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold text-white mb-3">
              Select a College
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Choose your college to start asking admission-related questions.
            </p>
          </motion.div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto" />
              <p className="text-gray-500 text-sm mt-4">Loading colleges...</p>
            </div>
          ) : (
            <CollegeSelector colleges={colleges} />
          )}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-600 text-sm">
            &copy; {new Date().getFullYear()} Admission RAG Chatbot Platform. Built with AI &amp; RAG technology.
          </p>
        </div>
      </footer>
    </div>
  );
}
