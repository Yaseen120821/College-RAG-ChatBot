"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { GraduationCap, MessageCircle, LayoutDashboard, LogIn } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

const links = [
  { href: "/", label: "Home", icon: GraduationCap },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/admin", label: "Admin", icon: LayoutDashboard },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[hsl(230,25%,8%)]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
              <GraduationCap size={20} className="text-white" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight hidden sm:block">
              {APP_NAME}
            </span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-white"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-lg bg-white/[0.08] border border-white/10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon size={16} className="relative z-10" />
                  <span className="relative z-10 hidden sm:block">{label}</span>
                </Link>
              );
            })}

            <Link
              href="/login"
              className="ml-2 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-shadow"
            >
              <LogIn size={16} />
              <span className="hidden sm:block">Login</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
