/**
 * Registers Missing Digits with the platform (the UI-free part of the manifest).
 */
import type { GameEngine, TutorialStep } from "@cogniarena/game-core";
import {
  generateLevel,
  missingDigitsConfigSchema,
  missingDigitsResponsesSchema,
  nextLevel,
  plausibilityFlags,
  scoreLevel,
  type MissingDigitsConfig,
  type MissingDigitsLevel,
  type MissingDigitsResponses,
  type MissingDigitsResult,
} from "./engine";

/** Steps as data; the play screen's automatic demo walks through the same ideas. */
export const missingDigitsTutorial: TutorialStep[] = [
  { id: "equation", target: "equation", caption: "Fill each box with a digit from 1 to 9 so the equation is true." },
  { id: "once", target: "keypad", caption: "Each digit can be used only once." },
  { id: "order", target: "equation", caption: "× and ÷ are worked out before + and −." },
  { id: "submit", target: "submit", caption: "Any answer that makes it true counts. Press Submit." },
];

export const missingDigitsEngine: GameEngine<MissingDigitsConfig, MissingDigitsLevel, MissingDigitsResponses, MissingDigitsResult> = {
  slug: "missing-digits",
  title: "Missing Digits",
  companyTags: ["capgemini"],
  skills: ["numerical reasoning", "mental arithmetic"],
  version: 1,
  modes: ["assessment", "practice"],
  defaultDurationSec: 6 * 60,
  configSchema: missingDigitsConfigSchema,
  responsesSchema: missingDigitsResponsesSchema,
  generateLevel,
  scoreLevel,
  plausibility: plausibilityFlags,
  nextLevel,
  tutorial: missingDigitsTutorial,
};
