"use client";

/**
 * Continue with Google, email magic link, or play as guest. Signing in while a
 * guest keeps the guest's history (Better Auth links the accounts).
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient, ensureSession } from "@/lib/auth-client";

export function SignInForm({ googleEnabled, next }: { googleEnabled: boolean; next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    const res = await authClient.signIn.magicLink({ email, callbackURL: next });
    if (res.error) {
      setError(res.error.message ?? "Could not send the link.");
      setState("error");
    } else setState("sent");
  };

  const google = () => authClient.signIn.social({ provider: "google", callbackURL: next });

  const guest = async () => {
    await ensureSession();
    router.push(next === "/profile" ? "/dashboard" : next);
    router.refresh();
  };

  return (
    <div className="flex w-full flex-col gap-5">
      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={google}
            className="flex items-center justify-center gap-3 rounded-xl bg-white px-5 py-3 font-medium text-zinc-900 ring-1 ring-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-800"
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.5z" />
              <path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0 0 12 23.5z" />
              <path fill="#FBBC05" d="M5.6 14.2a6.9 6.9 0 0 1 0-4.4v-3H1.8a11.5 11.5 0 0 0 0 10.4z" />
              <path fill="#EA4335" d="M12 5.1c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 0 0 1.8 6.8l3.8 3C6.5 7.1 9 5.1 12 5.1z" />
            </svg>
            Continue with Google
          </button>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" /> or <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </>
      )}

      {state === "sent" ? (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
          Check <strong>{email}</strong> for a sign-in link. It expires in 5 minutes.
        </p>
      ) : (
        <form onSubmit={sendLink} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.edu"
              className="rounded-xl bg-zinc-100 px-4 py-3 text-base font-normal dark:bg-zinc-800"
            />
          </label>
          <button
            type="submit"
            disabled={state === "sending"}
            className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {state === "sending" ? "Sending…" : "Email me a sign-in link"}
          </button>
          {state === "error" && <p className="text-sm text-red-500">{error}</p>}
        </form>
      )}

      <button type="button" onClick={guest} className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        Play as guest instead
      </button>
    </div>
  );
}
