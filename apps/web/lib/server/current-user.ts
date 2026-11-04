/**
 * Who is calling. Every API handler and server page checks the session here;
 * the proxy's cookie check only handles redirects (PLAN.md → "Route protection").
 */
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { getAuth, type SessionUser } from "./auth";
import { ApiError } from "./sessions";

/** Current user in a server component, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  // Read headers first: it marks the page dynamic before anything opens the database.
  const h = await headers();
  const session = await getAuth().api.getSession({ headers: h });
  return session?.user ?? null;
}

/** Current user in a route handler; throws 401 when signed out. */
export async function requireUser(req: Request): Promise<SessionUser> {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) throw new ApiError(401, "unauthorized", "Sign in or play as guest first.");
  return session.user;
}

export async function requireAdmin(req: Request): Promise<SessionUser> {
  const u = await requireUser(req);
  if (u.role !== "admin") throw new ApiError(403, "forbidden");
  return u;
}

/** Wraps a route handler: ApiError → JSON error with its status. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  return async (...args: A) => {
    try {
      const body = await fn(...args);
      return body instanceof Response ? body : NextResponse.json(body ?? { ok: true });
    } catch (e) {
      if (e instanceof ApiError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
      if ((e as ZodError)?.name === "ZodError") return NextResponse.json({ error: "invalid-body" }, { status: 400 });
      console.error(e);
      return NextResponse.json({ error: "server-error" }, { status: 500 });
    }
  };
}
