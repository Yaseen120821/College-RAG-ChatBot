"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2, ArrowLeft, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";
import { db, isInstantDBConfigured } from "@/lib/db";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendCode = async () => {
    if (!email.trim() || !isInstantDBConfigured) return;
    setLoading(true);
    setError("");
    try {
      await db.auth.sendMagicCode({ email: email.trim() });
      setStep("code");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim() || !isInstantDBConfigured) return;
    setLoading(true);
    setError("");
    try {
      await db.auth.signInWithMagicCode({ email: email.trim(), code: code.trim() });
      window.location.href = "/chat";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 grid-pattern relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-violet-600/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-indigo-600/8 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="relative rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Top gradient bar */}
          <div className="h-1.5 bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500" />

          <div className="p-8">
            {/* Back link */}
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-gray-500 text-xs hover:text-gray-300 transition-colors mb-8"
            >
              <ArrowLeft size={14} />
              Back to home
            </Link>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/25 mb-4">
                <Sparkles size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">Welcome Back</h1>
              <p className="text-gray-500 text-sm">
                {step === "email"
                  ? "Enter your email to get a magic login code"
                  : `We sent a code to ${email}`}
              </p>
            </div>

            {/* InstantDB not configured warning */}
            {!isInstantDBConfigured && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5"
              >
                <AlertCircle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-amber-300 font-medium">Auth not configured</p>
                  <p className="text-xs text-amber-400/60 mt-0.5">
                    Set NEXT_PUBLIC_INSTANTDB_APP_ID in .env.local to enable authentication.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            {step === "email" ? (
              <div className="space-y-4">
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                    placeholder="you@email.com"
                    disabled={!isInstantDBConfigured}
                    className="w-full rounded-xl bg-white/[0.06] border border-white/10 pl-11 pr-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={handleSendCode}
                  disabled={loading || !email.trim() || !isInstantDBConfigured}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Send Magic Code"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
                  placeholder="Enter 6-digit code"
                  className="w-full rounded-xl bg-white/[0.06] border border-white/10 px-4 py-3 text-sm text-center text-gray-100 placeholder-gray-500 tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  maxLength={6}
                />
                <button
                  onClick={handleVerifyCode}
                  disabled={loading || !code.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Verify & Login"}
                </button>
                <button
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError("");
                  }}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Use a different email
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
