/**
 * Coach-mark tutorial steps as data (PLAN.md → "Tutorial and onboarding").
 * `target` matches a `data-tutorial="..."` attribute in the Play components;
 * the shared tutorial player reads these and runs the demos.
 */
import type { TutorialStep } from "@cogniarena/game-core";

export const gridRecallTutorial: TutorialStep[] = [
  { id: "grid", target: "grid", caption: "Balls will blink on this grid, one at a time.", demo: { action: "blink", payload: { row: 1, col: 1 } } },
  { id: "order", target: "grid", caption: "Remember the order they blink in.", demo: { action: "ghostNumber", payload: { row: 1, col: 1, n: 1 } } },
  { id: "shape-left", target: "shape-left", caption: "This is the original shape." },
  { id: "shape-right", target: "shape-right", caption: "Is this the same shape, only rotated?" },
  { id: "show-yes", target: "shape-right", caption: "It rotates back onto the original, so the answer is Yes.", demo: { action: "rotateOnto", payload: { answer: "yes" } } },
  { id: "show-no", target: "shape-right", caption: "A mirrored shape can never line up, so the answer is No.", demo: { action: "rotateOnto", payload: { answer: "no" } } },
  { id: "timer", target: "timer", caption: "Answer before the ring runs out." },
  { id: "recall", target: "grid", caption: "Then tap the cells in the order they blinked.", demo: { action: "tapSequence" } },
  { id: "controls", target: "recall-controls", caption: "Undo a tap, or Submit when you're done." },
  { id: "your-turn", target: "grid", caption: "Your turn: a practice round with a 3×3 grid and 2 balls." },
];

/** Config for the tutorial practice round. */
export const tutorialConfig = { rows: 3, cols: 3, balls: 2 } as const;
