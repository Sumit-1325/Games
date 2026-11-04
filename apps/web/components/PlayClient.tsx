"use client";

/**
 * Holds the session seed. The first seed comes from the server (the same flow
 * the session API will use later); "Play again" makes a fresh one in the
 * browser, and the key change remounts the game with clean state.
 */
import { useState } from "react";
import { randomSeed } from "@cogniarena/game-core";
import type { GridRecallConfig } from "@cogniarena/grid-recall";
import { GridRecallPlay, type PlayMode } from "@cogniarena/grid-recall/components";

export function PlayClient(props: { seed: string; mode: PlayMode; config: GridRecallConfig; durationMs: number | null }) {
  const [seed, setSeed] = useState(props.seed);
  return (
    <GridRecallPlay
      key={seed}
      seed={seed}
      mode={props.mode}
      config={props.config}
      durationMs={props.durationMs}
      onPlayAgain={() => setSeed(randomSeed())}
    />
  );
}
