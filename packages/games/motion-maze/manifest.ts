import type { GameEngine } from "@cogniarena/game-core";
import {
  generateLevel,
  motionMazeConfigSchema,
  motionMazeResponsesSchema,
  nextLevel,
  plausibilityFlags,
  scoreLevel,
  type MotionMazeConfig,
  type MotionMazeLevel,
  type MotionMazeResponses,
  type MotionMazeResult,
} from "./engine";
import { motionMazeTutorial } from "./tutorial";

export const motionMazeEngine: GameEngine<MotionMazeConfig, MotionMazeLevel, MotionMazeResponses, MotionMazeResult> = {
  slug: "motion-maze",
  title: "Motion Maze",
  companyTags: ["capgemini"],
  skills: ["spatial reasoning", "planning", "problem solving"],
  version: 1,
  modes: ["assessment", "practice"],
  defaultDurationSec: 6 * 60,
  configSchema: motionMazeConfigSchema,
  responsesSchema: motionMazeResponsesSchema,
  generateLevel,
  scoreLevel,
  plausibility: plausibilityFlags,
  nextLevel,
  tutorial: motionMazeTutorial,
};

