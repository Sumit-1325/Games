"use client";

/**
 * Tutorial (PLAN.md → "Tutorial and onboarding"):
 *   1. coach-mark walkthrough (shared TutorialPlayer + Grid Recall's demo stage),
 *   2. practice round: 3×3, 2 balls, no timer, right/wrong after each answer,
 *   3. pass it once → tutorialCompleted is saved and Assessment unlocks.
 * Tutorial rounds are not saved as sessions.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { randomSeed } from "@cogniarena/game-core";
import { gridRecallTutorial, tutorialConfig, type GridRecallResult } from "@cogniarena/grid-recall";
import { GridRecallPlay, GridRecallTutorialStage } from "@cogniarena/grid-recall/components";
import { TutorialPlayer } from "@cogniarena/ui";
import { api } from "@/lib/api";
import { ensureSession } from "@/lib/auth-client";
import { useSettings } from "@/lib/settings";

type Stage = "walkthrough" | "practice" | "saving" | "done";

export function TutorialFlow({ alreadyCompleted }: { alreadyCompleted: boolean }) {
  const { sound } = useSettings();
  const [stage, setStage] = useState<Stage>("walkthrough");
  const [seed, setSeed] = useState(randomSeed);
  const [failedOnce, setFailedOnce] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const router = useRouter();
  const onLevelComplete = useCallback(
    async (_: unknown, result: GridRecallResult) => {
      if (!result.passed) return setFailedOnce(true);
      // Save before showing "You're ready", so the lobby is unlocked when they get there.
      setStage("saving");
      try {
        await ensureSession();
        await api.completeTutorial("grid-recall");
        router.refresh();
      } catch {
        setSaveError(true);
      }
      setStage("done");
    },
    [router],
  );

  if (stage === "saving") return <p className="py-20 text-zinc-500">Saving your progress…</p>;

  if (stage === "walkthrough") {
    return (
      <div className="flex w-full flex-col items-center gap-3">
        <h1 className="text-xl font-semibold">How to play Grid Recall</h1>
        <TutorialPlayer
          steps={gridRecallTutorial}
          renderStage={(step) => <GridRecallTutorialStage step={step} />}
          onFinish={() => setStage("practice")}
        />
      </div>
    );
  }

  if (stage === "practice") {
    return (
      <div className="flex w-full flex-col items-center gap-3">
        <h1 className="text-xl font-semibold">Practice round</h1>
        <p className="max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
          {failedOnce
            ? "Not quite: try again. Tap the cells in the order they blinked, and get both shape questions right."
            : "3×3 grid, 2 balls, no timer. You'll see whether each shape answer was right."}
        </p>
        <GridRecallPlay
          key={seed}
          seed={seed}
          mode="tutorial"
          config={tutorialConfig}
          durationMs={null}
          answerFeedbackMs={2200}
          sound={sound}
          onLevelComplete={onLevelComplete}
          onPlayAgain={() => setSeed(randomSeed())}
        />
        <button type="button" onClick={() => setStage("walkthrough")} className="text-sm text-zinc-500 hover:underline">
          Watch the walkthrough again
        </button>
      </div>
    );
  }

  return (
    <div className="flex max-w-md flex-col items-center gap-5 py-16 text-center">
      <p className="text-5xl" aria-hidden>
        ✓
      </p>
      <h1 className="text-2xl font-bold">You&apos;re ready</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        {alreadyCompleted ? "Practice round passed again." : "Assessment mode is now unlocked."}
        {saveError && " (We couldn't save this, so you may be asked to repeat it.)"}
      </p>
      <div className="flex gap-3">
        <Link href="/games/grid-recall/play?mode=assessment" className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500">
          Start assessment
        </Link>
        <Link href="/games/grid-recall" className="rounded-xl bg-zinc-200 px-6 py-3 font-medium hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700">
          Lobby
        </Link>
      </div>
    </div>
  );
}
