/**
 * Registers Grid Recall with the platform. This is the UI-free part of the
 * GameManifest; the web app adds the React Play component.
 */
import type { GameEngine } from "@cogniarena/game-core";
import {
  generateLevel,
  gridRecallConfigSchema,
  gridRecallResponsesSchema,
  nextLevel,
  plausibilityFlags,
  scoreLevel,
  type GridRecallConfig,
  type GridRecallLevel,
  type GridRecallResponses,
  type GridRecallResult,
} from "./engine";
import { gridRecallTutorial } from "./tutorial";

export const gridRecallEngine: GameEngine<GridRecallConfig, GridRecallLevel, GridRecallResponses, GridRecallResult> = {
  slug: "grid-recall",
  title: "Grid Recall",
  companyTags: ["capgemini"],
  skills: ["working memory", "spatial rotation"],
  version: 2,
  modes: ["assessment", "practice"],
  defaultDurationSec: 6 * 60,
  configSchema: gridRecallConfigSchema,
  responsesSchema: gridRecallResponsesSchema,
  generateLevel,
  scoreLevel,
  plausibility: plausibilityFlags,
  nextLevel,
  tutorial: gridRecallTutorial,
};
