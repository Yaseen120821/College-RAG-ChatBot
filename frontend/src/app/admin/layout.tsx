"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Upload,
  BarChart3,
  ChevronLeft,
  GraduationCap,
} from "lucide-react";

const sidebarLinks = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/upload", label: "Upload Documents", icon: Upload },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-[hsl(230,25%,8%)]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-white/[0.06] bg-[hsl(230,25%,10%)]/60 backdrop-blur-xl z-50 flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white block">Admin Panel</span>
              <span className="text-[10px] text-gray-500">RAG Chatbot Platform</span>
            </div>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1">
          {sidebarLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "text-white bg-white/[0.08] border border-white/10"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                }`}
              >
                <Icon size={18} />
                {label}
                {isActive && (
                  <motion.div
                    layoutId="admin-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-violet-500"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Back to site */}
        <div className="p-3 border-t border-white/[0.06]">
          <Link
            href="/"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Site
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
