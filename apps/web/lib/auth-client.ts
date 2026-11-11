"use client";

/** Browser side of Better Auth, plus `ensureSession` for guest play. */
import { anonymousClient, inferAdditionalFields, magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    magicLinkClient(),
    anonymousClient(),
    inferAdditionalFields({
      user: {
        role: { type: "string", input: false },
        college: { type: "string", required: false },
        graduationYear: { type: "number", required: false },
        targetCompanies: { type: "string", required: false },
      },
    }),
  ],
});

let inFlightEnsure: Promise<void> | null = null;

/** Signs the visitor in as a guest if they have no session yet. Cached and deduped. */
export function ensureSession(): Promise<void> {
  // If the browser already holds a session token cookie, skip the network call.
  if (typeof document !== "undefined" && document.cookie.includes("session_token")) {
    return Promise.resolve();
  }
  if (!inFlightEnsure) {
    inFlightEnsure = (async () => {
      try {
        const { data } = await authClient.getSession();
        if (data) return;
        const res = await authClient.signIn.anonymous();
        if (res.error) throw new Error(res.error.message ?? "Could not start a guest session");
      } finally {
        inFlightEnsure = null;
      }
    })();
  }
  return inFlightEnsure;
}
