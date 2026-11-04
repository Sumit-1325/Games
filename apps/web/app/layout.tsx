import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "CogniArena",
  description: "Practise the cognitive games used in campus hiring tests.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // next-themes sets the theme class on <html> before React hydrates.
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="flex min-h-dvh flex-col font-sans">
        <ThemeProvider>
          <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold text-indigo-600 dark:text-indigo-400">
              <Logo className="size-7" />
              <span className="text-zinc-900 dark:text-zinc-100">CogniArena</span>
            </Link>
            <ThemeToggle />
          </nav>
          <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-8">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
