"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ChevronLeft, Sparkles } from "lucide-react";
import Link from "next/link";

import Navbar from "@/components/Navbar";
import ChatBubble from "@/components/ChatBubble";
import ChatInput from "@/components/ChatInput";
import LoadingDots from "@/components/LoadingDots";
import LeadCaptureModal from "@/components/LeadCaptureModal";
import { sendChatMessage } from "@/lib/api";
import { db, isInstantDBConfigured } from "@/lib/db";
import { id as instantId } from "@instantdb/react";

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: string;
}

function ChatContent() {
  const searchParams = useSearchParams();
  const collegeId = searchParams.get("college") || "college_1";

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Welcome message
  useEffect(() => {
    const welcome: Message = {
      id: "welcome",
      text: `👋 Hello! I'm your AI admission assistant for **${collegeId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}**.\n\nI can help you with:\n• Admission process & eligibility\n• Fee structure & scholarships\n• Course details & seat availability\n• Important dates & deadlines\n\nAsk me anything about admissions!`,
      isBot: true,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([welcome]);
  }, [collegeId]);

  const handleSend = async (text: string) => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      text,
      isBot: false,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await sendChatMessage(collegeId, text);

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        text: response.answer,
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);

      // Log to InstantDB (only if configured)
      if (isInstantDBConfigured) {
        try {
          db.transact(
            db.tx.chats[instantId()].update({
              question: text,
              answer: response.answer,
              collegeId,
              answered: response.answered,
              createdAt: Date.now(),
            })
          );
        } catch (dbErr) {
          console.warn("InstantDB log failed:", dbErr);
        }
      }

      // Show lead capture after every 3 answered messages
      const newCount = messageCount + 1;
      setMessageCount(newCount);
      if (response.answered && newCount % 3 === 0) {
        setTimeout(() => setShowLeadModal(true), 1500);
      }
    } catch (err) {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        text: "Sorry, I encountered an error. Please try again.",
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(230,25%,8%)]">
      <Navbar />

      {/* Chat header */}
      <div className="fixed top-16 left-0 right-0 z-40 border-b border-white/10 bg-[hsl(230,25%,10%)]/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={18} />
          </Link>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Bot size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white">Admission Assistant</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-gray-500">
                {collegeId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-full border border-violet-500/20">
            <Sparkles size={12} />
            RAG Powered
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 pt-[8.5rem] pb-[5rem]">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <AnimatePresence>
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg.text}
                isBot={msg.isBot}
                timestamp={msg.timestamp}
              />
            ))}
          </AnimatePresence>

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl">
                <LoadingDots />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSend={handleSend} disabled={loading} />
        </div>
      </div>

      {/* Lead capture */}
      <LeadCaptureModal
        isOpen={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        collegeId={collegeId}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[hsl(230,25%,8%)]">
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
