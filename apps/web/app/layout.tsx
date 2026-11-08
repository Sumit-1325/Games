import type { Metadata } from "next";
// Inter is loaded via next/font/google at runtime (fetched from Google Fonts CDN).
// If you need to build offline or self-host, switch to next/font/local.
// The CSS fallback chain in globals.css (ui-sans-serif, system-ui) covers offline builds.
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { NavUser } from "@/components/NavUser";
import { SettingsEffects } from "@/components/SettingsEffects";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";



export const metadata: Metadata = {
  title: "CogniArena",
  description: "Practise the cognitive games used in campus hiring tests.",
};

// Preconnect + load Inter from Google Fonts CDN (non-blocking, build-time safe).
function InterFont() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
      />
    </>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // next-themes sets the theme class on <html> before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <InterFont />
      </head>
      <body className="flex min-h-dvh flex-col font-sans">
        <ThemeProvider>
          <SettingsEffects />
          <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/80">
            <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
              <Link href="/" className="flex items-center gap-2.5 text-lg font-bold text-indigo-600 dark:text-indigo-400">
                <Logo className="size-8" />
                <span className="hidden text-zinc-900 min-[430px]:inline dark:text-zinc-100">CogniArena</span>
              </Link>
              <div className="flex items-center gap-1">
                <NavUser />
                <ThemeToggle />
              </div>
            </nav>
          </header>
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-8 sm:px-6">{children}</main>
          <footer className="border-t border-zinc-200 dark:border-zinc-800">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:text-zinc-400">
              <p>Independent practice tool, not affiliated with any company or assessment provider.</p>
              <div className="flex gap-5">
                <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                  Dashboard
                </Link>
                <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                  Privacy
                </Link>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
