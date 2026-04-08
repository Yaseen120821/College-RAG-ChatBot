"use client";

import { motion } from "framer-motion";
import { Building2, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

interface CollegeSelectorProps {
  colleges: { id: string; name: string; doc_count: number }[];
}

export default function CollegeSelector({ colleges }: CollegeSelectorProps) {
  if (colleges.length === 0) {
    return (
      <div className="text-center py-16">
        <Building2 size={48} className="mx-auto text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-300 mb-2">No Colleges Yet</h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Upload admission documents through the admin dashboard to get started.
        </p>
        <Link
          href="/admin/upload"
          className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-shadow"
        >
          Go to Admin <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {colleges.map((college, i) => (
        <motion.div
          key={college.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
        >
          <Link href={`/chat?college=${college.id}`}>
            <div className="group relative overflow-hidden rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-6 hover:bg-white/[0.07] transition-all duration-300 hover:border-violet-500/30 hover:shadow-xl hover:shadow-violet-500/10">
              {/* Gradient glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl group-hover:bg-violet-500/20 transition-all duration-500" />

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center mb-4">
                  <Building2 size={22} className="text-violet-400" />
                </div>

                <h3 className="text-lg font-semibold text-white mb-1.5 group-hover:text-violet-300 transition-colors">
                  {college.name}
                </h3>

                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <FileText size={12} />
                  <span>{college.doc_count} documents uploaded</span>
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-violet-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Start chatting <ArrowRight size={14} />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
