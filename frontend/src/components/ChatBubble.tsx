"use client";

import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";

interface ChatBubbleProps {
  message: string;
  isBot: boolean;
  timestamp?: string;
}

export default function ChatBubble({ message, isBot, timestamp }: ChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex gap-3 ${isBot ? "justify-start" : "justify-end"}`}
    >
      {isBot && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Bot size={16} className="text-white" />
        </div>
      )}

      <div
        className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-md ${
          isBot
            ? "bg-white/[0.06] backdrop-blur-xl border border-white/10 text-gray-100"
            : "bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
        {timestamp && (
          <p className={`text-[10px] mt-1.5 ${isBot ? "text-gray-500" : "text-violet-200"}`}>
            {timestamp}
          </p>
        )}
      </div>

      {!isBot && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <User size={16} className="text-white" />
        </div>
      )}
    </motion.div>
  );
}
