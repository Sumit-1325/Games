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

/** Signs the visitor in as a guest if they have no session yet. */
export async function ensureSession(): Promise<void> {
  const { data } = await authClient.getSession();
  if (data) return;
  const res = await authClient.signIn.anonymous();
  if (res.error) throw new Error(res.error.message ?? "Could not start a guest session");
}
