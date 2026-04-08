"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, FileText, MessageCircle, Users, TrendingUp } from "lucide-react";
import { fetchColleges, CollegeInfo } from "@/lib/api";
import { db, isInstantDBConfigured } from "@/lib/db";

export default function AdminOverview() {
  const [colleges, setColleges] = useState<CollegeInfo[]>([]);

  useEffect(() => {
    fetchColleges().then(setColleges).catch(console.error);
  }, []);

  // Always call hooks (rules of hooks). With placeholder ID, these return empty data.
  const chatsQuery = db.useQuery({ chats: {} });
  const leadsQuery = db.useQuery({ leads: {} });

  const totalDocs = colleges.reduce((sum, c) => sum + c.doc_count, 0);
  const totalChats = chatsQuery.data?.chats?.length || 0;
  const totalLeads = leadsQuery.data?.leads?.length || 0;
  const unansweredChats = chatsQuery.data?.chats?.filter((c: Record<string, unknown>) => !c.answered)?.length || 0;

  const stats = [
    { label: "Colleges", value: colleges.length, icon: Building2, color: "from-violet-500 to-indigo-500" },
    { label: "Documents", value: totalDocs, icon: FileText, color: "from-blue-500 to-cyan-500" },
    { label: "Total Chats", value: totalChats, icon: MessageCircle, color: "from-emerald-500 to-teal-500" },
    { label: "Leads Captured", value: totalLeads, icon: Users, color: "from-amber-500 to-orange-500" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard Overview</h1>
        <p className="text-gray-500 text-sm">Monitor your chatbot performance and manage colleges.</p>
      </div>

      {!isInstantDBConfigured && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl bg-violet-500/10 border border-violet-500/20 p-4 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle size={16} className="text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-violet-300">InstantDB not configured</p>
            <p className="text-xs text-violet-400/60 mt-0.5">
              Set NEXT_PUBLIC_INSTANTDB_APP_ID in .env.local to enable chat logging, lead capture, and analytics.
            </p>
          </div>
        </motion.div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] p-5 hover:bg-white/[0.06] transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                <stat.icon size={18} className="text-white" />
              </div>
              <TrendingUp size={14} className="text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Colleges table */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold text-white">Active Colleges</h2>
        </div>
        {colleges.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No colleges yet. Upload documents to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">College</th>
                <th className="text-left px-6 py-3 font-medium">ID</th>
                <th className="text-right px-6 py-3 font-medium">Documents</th>
              </tr>
            </thead>
            <tbody>
              {colleges.map((college) => (
                <tr
                  key={college.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-3.5 text-white font-medium">{college.name}</td>
                  <td className="px-6 py-3.5">
                    <code className="text-xs px-2 py-0.5 rounded bg-white/[0.06] text-gray-400">
                      {college.id}
                    </code>
                  </td>
                  <td className="px-6 py-3.5 text-right text-gray-400">{college.doc_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {unansweredChats > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle size={16} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-300">{unansweredChats} unanswered queries</p>
            <p className="text-xs text-amber-400/60 mt-0.5">Consider uploading more documents to improve coverage.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
