/**
 * The game registry: one entry per game, holding the pure engine from the game
 * package plus page copy. Pages look games up by slug, so adding a game means
 * adding one entry here and one in components/gameClients.tsx (its screens).
 */
import type { GameEngine } from "@cogniarena/game-core";
import { gridRecallEngine } from "@cogniarena/grid-recall";
import { missingDigitsEngine } from "@cogniarena/missing-digits";

export interface RegisteredGame {
  // Each game's generic types differ; pages only read the metadata.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  engine: GameEngine<any, any, any, any>;
  description: string;
  /** Lobby text for the Assessment box: what the automatic demo shows. */
  demoBlurb: string;
  /** Practice lets the player pick rows and columns. */
  practiceGridSize?: boolean;
  /** Has a full coach-mark walkthrough at /games/<slug>/tutorial. */
  hasWalkthrough?: boolean;
}

export const games: Record<string, RegisteredGame> = {
  "grid-recall": {
    engine: gridRecallEngine,
    description:
      "Remember the order in which balls blink on a grid, while answering a quick shape-rotation question between every blink.",
    demoBlurb:
      "Starts with a quick demo: a ball blinks and you answer one shape question. Then press Start and the timer begins. Each level adds one more ball.",
    practiceGridSize: true,
    hasWalkthrough: true,
  },
  "missing-digits": {
    engine: missingDigitsEngine,
    description: "Fill the empty boxes with digits 1–9 so the equation is true, using each digit only once.",
    demoBlurb:
      "Starts with a quick demo: we solve one equation for you, then you try one. Then press Start and the timer begins. Equations get longer as you pass.",
  },
};

export function getGame(slug: string): RegisteredGame | undefined {
  return games[slug];
}
