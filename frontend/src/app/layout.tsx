import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Admission RAG Chatbot — AI-Powered College Admissions Assistant",
  description:
    "Get instant, accurate answers about college admissions, fees, eligibility, scholarships, and more. Powered by AI with Retrieval-Augmented Generation.",
  keywords: ["college admission", "chatbot", "RAG", "AI assistant", "admission queries"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
