import type { TutorialStep } from "@cogniarena/game-core";

export const motionMazeTutorial: TutorialStep[] = [
  {
    id: "red-ball",
    target: "red-ball",
    caption: "This is your Red Ball. Move it across the grid to reach the target.",
  },
  {
    id: "target",
    target: "target-hole",
    caption: "This is the Black Target. Reach it in the fewest moves possible to earn maximum points.",
  },
  {
    id: "sliding-blocks",
    target: "block-item",
    caption: "Obstacle bars block the path. Slide horizontal bars left/right and vertical bars up/down.",
  },
  {
    id: "fixed-walls",
    target: "fixed-wall",
    caption: "Dark walls are fixed obstacles that cannot be moved.",
  },
  {
    id: "controls",
    target: "board-controls",
    caption: "Tap adjacent cells or use Arrow keys to move the ball. Click or drag bars to slide them. Use Undo if needed.",
  },
];

