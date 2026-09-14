import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HRMM - (주)대산 인력 및 마트 스케줄러",
  description: "(주)대산 인력 및 마트 스케줄 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-gray-50 text-gray-900`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 relative">
        <Navbar />
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 sm:pb-8">
          {children}
        </main>

        {/* 좌측 하단 고정 (주)대산 로고 고정 노출 */}
        <aside
          aria-label="(주)대산 푸터 로고"
          className="fixed left-3 bottom-3 sm:left-5 sm:bottom-5 z-40 pointer-events-auto select-none"
        >
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl shadow-lg border border-gray-200/90 flex items-center gap-2 hover:shadow-xl hover:border-blue-300 transition-all duration-200 group">
            <img
              src="/logo.png"
              alt="(주)대산 로고"
              className="h-6 sm:h-8 w-auto object-contain group-hover:scale-105 transition-transform"
            />
            <span className="text-[11px] sm:text-xs font-extrabold text-gray-700 border-l border-gray-200 pl-2">
              (주)대산
            </span>
          </div>
        </aside>
      </body>
    </html>
  );
}
