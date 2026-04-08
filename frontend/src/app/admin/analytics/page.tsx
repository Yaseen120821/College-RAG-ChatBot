"use client";

import { motion } from "framer-motion";
import { BarChart3, MessageCircle, HelpCircle, UserCheck, AlertCircle } from "lucide-react";
import { db, isInstantDBConfigured } from "@/lib/db";

export default function AnalyticsPage() {
  // Always call hooks (valid-format UUID placeholder returns empty data)
  const chatsQuery = db.useQuery({ chats: {} });
  const leadsQuery = db.useQuery({ leads: {} });

  const chats: Record<string, unknown>[] = chatsQuery.data?.chats || [];
  const leads: Record<string, unknown>[] = leadsQuery.data?.leads || [];

  // Compute analytics
  const totalChats = chats.length;
  const answeredChats = chats.filter((c) => c.answered).length;
  const unansweredChats = totalChats - answeredChats;
  const answerRate = totalChats > 0 ? Math.round((answeredChats / totalChats) * 100) : 0;

  // Top questions
  const questionCounts: Record<string, number> = {};
  chats.forEach((c) => {
    const q = ((c.question as string) || "").toLowerCase().trim();
    if (q) questionCounts[q] = (questionCounts[q] || 0) + 1;
  });
  const topQuestions = Object.entries(questionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Unanswered questions
  const unansweredList = chats
    .filter((c) => !c.answered)
    .map((c) => c.question as string)
    .slice(0, 10);

  // Leads by college
  const leadsByCollege: Record<string, number> = {};
  leads.forEach((l) => {
    const cid = (l.collegeId as string) || "unknown";
    leadsByCollege[cid] = (leadsByCollege[cid] || 0) + 1;
  });

  const stats = [
    { label: "Total Queries", value: totalChats, icon: MessageCircle, color: "from-violet-500 to-indigo-500" },
    { label: "Answered", value: answeredChats, icon: BarChart3, color: "from-emerald-500 to-teal-500" },
    { label: "Unanswered", value: unansweredChats, icon: HelpCircle, color: "from-amber-500 to-orange-500" },
    { label: "Answer Rate", value: `${answerRate}%`, icon: UserCheck, color: "from-blue-500 to-cyan-500" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Analytics</h1>
        <p className="text-gray-500 text-sm">Real-time insights into chatbot usage and query patterns.</p>
      </div>

      {!isInstantDBConfigured && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={16} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-300">Analytics unavailable</p>
            <p className="text-xs text-amber-400/60 mt-0.5">
              Set NEXT_PUBLIC_INSTANTDB_APP_ID in .env.local to enable real-time analytics.
            </p>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] p-5"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg mb-3`}>
              <stat.icon size={18} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top queries */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2">
            <BarChart3 size={16} className="text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Top Queries</h2>
          </div>
          {topQuestions.length === 0 ? (
            <div className="text-center py-10 text-gray-600 text-sm">No queries yet.</div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {topQuestions.map(([question, count], i) => (
                <div key={i} className="px-6 py-3 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-white/[0.06] text-xs flex items-center justify-center text-gray-500 flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="flex-1 text-sm text-gray-300 truncate capitalize">{question}</p>
                  <span className="text-xs text-gray-500 bg-white/[0.06] px-2 py-0.5 rounded">
                    {count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unanswered queries */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2">
            <HelpCircle size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Unanswered Queries</h2>
          </div>
          {unansweredList.length === 0 ? (
            <div className="text-center py-10 text-gray-600 text-sm">
              All queries answered! 🎉
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {unansweredList.map((q, i) => (
                <div key={i} className="px-6 py-3 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <p className="text-sm text-gray-300 truncate">{q}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leads by college */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden lg:col-span-2">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2">
            <UserCheck size={16} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Leads by College</h2>
          </div>
          {Object.keys(leadsByCollege).length === 0 ? (
            <div className="text-center py-10 text-gray-600 text-sm">No leads captured yet.</div>
          ) : (
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Object.entries(leadsByCollege).map(([college, count]) => (
                <div
                  key={college}
                  className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 text-center"
                >
                  <p className="text-xl font-bold text-white">{count}</p>
                  <p className="text-xs text-gray-500 mt-1 capitalize">{college.replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
