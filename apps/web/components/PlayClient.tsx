"use client";

/**
 * Runs one session of any game against the session API:
 *   1. POST /api/sessions → server-issued seed (on 401, sign in as a guest and retry),
 *   2. play,
 *   3. POST each finished level → the server re-scores it,
 *   4. POST finish → link to the saved Results page.
 * If the API is unreachable the game still plays from a local seed (not saved).
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { randomSeed } from "@cogniarena/game-core";
import { gameClients } from "@/components/gameClients";
import { api, ApiClientError } from "@/lib/api";
import { ensureSession } from "@/lib/auth-client";
import { useSettings } from "@/lib/settings";

type Config = Record<string, unknown>;

type Run =
  | { status: "loading" }
  | { status: "ready"; sessionId: string | null; seed: string; config: Config; durationMs: number | null }
  | { status: "blocked"; code: string; message: string };

export function PlayClient(props: { slug: string; mode: "assessment" | "practice"; config: Config; minutes: number }) {
  const { slug, mode, config, minutes } = props;
  const { Play, WarmUp } = gameClients[slug]!;
  const { sound } = useSettings();
  const [run, setRun] = useState<Run>({ status: "loading" });
  const [round, setRound] = useState(0);
  // Assessment opens with the short demo (like the real test); the session is created meanwhile.
  const [demoDone, setDemoDone] = useState(mode !== "assessment");
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const pending = useRef<Promise<unknown>[]>([]);

  useEffect(() => {
    let cancelled = false;
    setRun({ status: "loading" });
    setSaved("idle");
    pending.current = [];
    (async () => {
      const start = () => api.startSession({ gameSlug: slug, mode, config, minutes });
      try {
        // Prewarm session token; returns immediately if already authenticated
        await ensureSession();
        const s = await start().catch(async (e) => {
          if (!(e instanceof ApiClientError && e.status === 401)) throw e;
          await ensureSession();
          return start();
        });
        if (!cancelled) setRun({ status: "ready", sessionId: s.sessionId, seed: s.seed, config: s.config as Config, durationMs: s.durationMs });
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiClientError && e.status < 500 && e.status !== 401) {
          setRun({ status: "blocked", code: e.code, message: e.message });
        } else {
          // Offline / server down: play locally, results are not saved.
          setRun({ status: "ready", sessionId: null, seed: randomSeed(), config, durationMs: mode === "assessment" ? minutes * 60_000 : null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, mode, config, minutes, round]);

  const sessionId = run.status === "ready" ? run.sessionId : null;

  const onLevelComplete = useCallback(
    (submission: { attempt: number; responses: unknown }) => {
      if (!sessionId) return;
      pending.current.push(api.submitLevel(sessionId, { attempt: submission.attempt, responses: submission.responses }));
    },
    [sessionId],
  );

  const onSessionOver = useCallback(async () => {
    if (!sessionId) return;
    setSaved("saving");
    try {
      await Promise.allSettled(pending.current);
      await api.finishSession(sessionId);
      setSaved("saved");
    } catch {
      setSaved("failed");
    }
  }, [sessionId]);

  if (!demoDone) return <WarmUp onStart={() => setDemoDone(true)} startLabel="Start assessment" />;
  if (run.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-zinc-500">
        <div className="size-10 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
        <p className="text-sm font-medium animate-pulse">Setting up game…</p>
      </div>
    );
  }
  if (run.status === "blocked") {
    return (
      <div className="flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg font-semibold">{run.message}</p>
        <Link href={`/games/${slug}`} className="text-sm text-zinc-500 hover:underline">
          Back to the lobby
        </Link>
      </div>
    );
  }

  const footer =
    run.sessionId === null ? (
      <p className="text-sm text-zinc-500">Offline: this session wasn&apos;t saved.</p>
    ) : saved === "saved" ? (
      <Link href={`/results/${run.sessionId}`} className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
        See saved results →
      </Link>
    ) : saved === "failed" ? (
      <p className="text-sm text-red-500">Couldn&apos;t save this session.</p>
    ) : (
      <p className="text-sm text-zinc-500">Saving…</p>
    );

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {run.sessionId === null && <p className="text-sm text-amber-600">Can&apos;t reach the server: playing offline, results won&apos;t be saved.</p>}
      <Play
        key={run.seed}
        seed={run.seed}
        mode={mode}
        config={run.config}
        durationMs={run.durationMs}
        sound={sound}
        autoStart={mode === "assessment"}
        onLevelComplete={onLevelComplete}
        onSessionOver={onSessionOver}
        onPlayAgain={() => setRound((r) => r + 1)}
        resultsFooter={footer}
      />
    </div>
  );
}
