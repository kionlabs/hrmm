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
  title: "대산유통 통합 ERP MVP",
  description: "행사 일정, 매출, 정산을 연결하는 대산유통 업무 시스템",
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
      <body className="min-h-full bg-gray-100 text-gray-900">
        <div className="min-h-screen lg:flex">
          <Navbar />
          <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-10 pt-20 sm:px-6 lg:px-8 lg:pt-7">
            <div className="mx-auto min-w-0 w-full max-w-[1500px]">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
