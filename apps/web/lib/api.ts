"use client";

/** Typed fetch helpers for the session API, used by client components. */
export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiClientError(res.status, data.error ?? "error", data.message ?? data.error ?? res.statusText);
  return data as T;
}

export interface StartedSession {
  sessionId: string;
  seed: string;
  config: Record<string, unknown>;
  durationMs: number | null;
}

export const api = {
  startSession: (body: { gameSlug: string; mode: "assessment" | "practice"; config?: object; minutes?: number }) =>
    call<StartedSession>("POST", "/api/sessions", body),
  submitLevel: (sessionId: string, body: { attempt: number; responses: unknown }) =>
    call<{ result: { passed: boolean; points: number }; flags: string[]; nextLevel: number }>(
      "POST",
      `/api/sessions/${sessionId}/levels`,
      body,
    ),
  finishSession: (sessionId: string) => call<{ sessionId: string; totalScore: number }>("POST", `/api/sessions/${sessionId}/finish`),
  completeTutorial: (game: string) => call("PATCH", "/api/me/progress", { game, tutorialCompleted: true }),
  deleteAccount: () => call("DELETE", "/api/me"),
  setGameActive: (slug: string, isActive: boolean) => call("PATCH", `/api/admin/games/${slug}`, { isActive }),
};
