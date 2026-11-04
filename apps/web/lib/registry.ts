/**
 * The game registry: one entry per game, holding the pure engine from the game
 * package plus page copy. Pages look games up by slug, so adding a game means
 * adding one entry here.
 */
import type { GameEngine } from "@cogniarena/game-core";
import { gridRecallEngine } from "@cogniarena/grid-recall";

export interface RegisteredGame {
  // Each game's generic types differ; pages only read the metadata.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  engine: GameEngine<any, any, any, any>;
  description: string;
}

export const games: Record<string, RegisteredGame> = {
  "grid-recall": {
    engine: gridRecallEngine,
    description:
      "Remember the order in which balls blink on a grid, while answering a quick shape-rotation question between every blink.",
  },
};

export function getGame(slug: string): RegisteredGame | undefined {
  return games[slug];
}
