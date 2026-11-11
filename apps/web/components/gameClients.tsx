"use client";

/**
 * Each game's screens, by slug: the Play screen and the automatic demo that
 * opens an assessment. Every game's Play component takes the same props.
 */
import type { ComponentType, ReactNode } from "react";
import { GridRecallPlay, GridRecallWarmUp } from "@cogniarena/grid-recall/components";
import { MissingDigitsPlay, MissingDigitsWarmUp } from "@cogniarena/missing-digits/components";
import { MotionMazePlay, MotionMazeWarmUp } from "@cogniarena/motion-maze/components";

export interface PlayProps {
  seed: string;
  mode: "assessment" | "practice";
  config?: Record<string, unknown>;
  durationMs: number | null;
  sound?: boolean;
  autoStart?: boolean;
  onPlayAgain: () => void;
  onLevelComplete?: (submission: { attempt: number; responses: unknown }) => void;
  onSessionOver?: () => void;
  resultsFooter?: ReactNode;
}

export interface GameClient {
  Play: ComponentType<PlayProps>;
  WarmUp: ComponentType<{ onStart: () => void; startLabel?: string }>;
}

export const gameClients: Record<string, GameClient> = {
  "grid-recall": { Play: GridRecallPlay as ComponentType<PlayProps>, WarmUp: GridRecallWarmUp },
  "missing-digits": { Play: MissingDigitsPlay as ComponentType<PlayProps>, WarmUp: MissingDigitsWarmUp },
  "motion-maze": { Play: MotionMazePlay as ComponentType<PlayProps>, WarmUp: MotionMazeWarmUp },
};
