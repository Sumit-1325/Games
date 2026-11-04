import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { NavUser } from "@/components/NavUser";
import { SettingsEffects } from "@/components/SettingsEffects";
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
          <SettingsEffects />
          <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold text-indigo-600 dark:text-indigo-400">
              <Logo className="size-7" />
              <span className="text-zinc-900 dark:text-zinc-100">CogniArena</span>
            </Link>
            <div className="flex items-center gap-1">
              <NavUser />
              <ThemeToggle />
            </div>
          </nav>
          <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-8">{children}</main>
          <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-zinc-500">
            Independent practice tool, not affiliated with any company or assessment provider. ·{" "}
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
