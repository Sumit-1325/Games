/**
 * Builds one level from a seed: which cells blink, in what order, and the
 * shape question shown after each blink. Same (seed, level, config) → same level,
 * so the server can rebuild it to score a submission.
 */
import { createRng, type Cell, type Rng } from "@cogniarena/game-core";
import { settingsFor, type GridRecallConfig, type LevelSettings } from "./levels";
import { L_TETROMINO, mirror, randomChiralShape, rotate, type QuarterTurns, type Shape } from "./shapes";

export type Answer = "yes" | "no";

export interface ShapeTask {
  left: Shape;
  right: Shape;
  /** Quarter turns applied to make the right shape. */
  turns: QuarterTurns;
  mirrored: boolean;
  /** "yes" = right is the left shape rotated; "no" = it is mirrored. */
  answer: Answer;
}

export interface GridRecallLevel {
  level: number;
  rows: number;
  cols: number;
  /** Cells in blink order; all distinct. */
  sequence: Cell[];
  /** tasks[i] is shown right after sequence[i] blinks. */
  tasks: ShapeTask[];
  timings: { blinkMs: number; distractorMs: number };
}

function makeShapeTask(rng: Rng, settings: LevelSettings, mirrored: boolean): ShapeTask {
  const base = settings.fixedL ? L_TETROMINO : randomChiralShape(rng, settings.shapeSize);
  // Show the left shape in a random orientation so it isn't always "upright".
  const left = rotate(base, rng.pick([0, 1, 2, 3] as const));
  const turns = rng.pick(settings.angles);
  const right = rotate(mirrored ? mirror(left) : left, turns);
  return { left, right, turns, mirrored, answer: mirrored ? "no" : "yes" };
}

/**
 * Half the answers are "yes" and half "no" (the odd one out is random), so
 * guessing scores about 50%.
 */
function balancedMirrorFlags(rng: Rng, count: number): boolean[] {
  const half = Math.floor(count / 2);
  const flags = [...Array<boolean>(half).fill(true), ...Array<boolean>(half).fill(false)];
  if (count % 2 === 1) flags.push(rng.chance());
  return rng.shuffle(flags);
}

export function generateLevel(seed: string, level: number, config: GridRecallConfig = {}): GridRecallLevel {
  const settings = settingsFor(level, config);
  // Mixing the level into the seed gives every level its own stream.
  const rng = createRng(`${seed}:grid-recall:${level}`);

  const allCells: Cell[] = [];
  for (let row = 0; row < settings.rows; row++) {
    for (let col = 0; col < settings.cols; col++) allCells.push({ row, col });
  }
  const sequence = rng.shuffle(allCells).slice(0, settings.balls);
  const tasks = balancedMirrorFlags(rng, settings.balls).map((m) => makeShapeTask(rng, settings, m));

  return {
    level,
    rows: settings.rows,
    cols: settings.cols,
    sequence,
    tasks,
    timings: { blinkMs: settings.blinkMs, distractorMs: settings.distractorMs },
  };
}
