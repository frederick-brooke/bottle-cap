import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bottle-Cap",
  description: "Incident Replay Tool - Capture production HTTP traffic, replay against staging",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center gap-6">
          <Link href="/" className="text-sm font-bold text-zinc-100">Bottle-Cap</Link>
          <Link href="/debug" className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Debug</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
