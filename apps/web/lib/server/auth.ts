/**
 * Better Auth (PLAN.md → "Auth"): Google, email magic link and guest play,
 * with users and sessions stored in our own Postgres.
 *
 * - Google is enabled when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set.
 * - Magic-link emails go through Resend when RESEND_API_KEY is set; otherwise
 *   the link is printed to the server console (local dev).
 * - Guests are real (anonymous) users. When a guest signs in, their sessions and
 *   progress move to the account (onLinkAccount → mergeUsers).
 * - Emails in ADMIN_EMAILS get the admin role when their account is created.
 *
 * Built lazily so `next build` never opens the database.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { anonymous, magicLink } from "better-auth/plugins";
import { authSchema, getDb } from "@cogniarena/db";
import { sendMagicLinkEmail } from "./email";
import { mergeUsers } from "./sessions";

export const googleEnabled = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

function createAuth() {
  const db = getDb();
  return betterAuth({
    appName: "CogniArena",
    database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
    socialProviders: googleEnabled()
      ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! } }
      : {},
    user: {
      additionalFields: {
        role: { type: "string", input: false, defaultValue: "user" },
        college: { type: "string", required: false },
        graduationYear: { type: "number", required: false },
        targetCompanies: { type: "string", required: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (u) => ({ data: { ...u, role: adminEmails().includes(u.email.toLowerCase()) ? "admin" : "user" } }),
        },
      },
    },
    plugins: [
      magicLink({ sendMagicLink: ({ email, url }) => sendMagicLinkEmail(email, url) }),
      anonymous({
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          await mergeUsers(db, anonymousUser.user.id, newUser.user.id);
        },
      }),
      nextCookies(), // must stay last
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;
const g = globalThis as typeof globalThis & { __cogniarenaAuth?: Auth };

export function getAuth(): Auth {
  g.__cogniarenaAuth ??= createAuth();
  return g.__cogniarenaAuth;
}

export type SessionUser = Auth["$Infer"]["Session"]["user"];
