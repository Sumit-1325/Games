/**
 * Database schema (PLAN.md → "Data model").
 *
 * - user / session / account / verification: the tables Better Auth needs.
 *   Property names must match Better Auth's field names.
 * - games, game_sessions, level_attempts, user_game_progress: the platform.
 *   Game-specific detail lives in JSONB, so a new game needs no schema change.
 */
import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, primaryKey, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// ---------- Better Auth ----------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  /** Guest players (Better Auth anonymous plugin). */
  isAnonymous: boolean("is_anonymous").default(false),
  role: text("role").notNull().default("user"),
  // Optional profile fields (PLAN.md → "Auth").
  college: text("college"),
  graduationYear: integer("graduation_year"),
  targetCompanies: text("target_companies"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- Platform ----------

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  companyTags: text("company_tags")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  version: integer("version").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const gameSessions = pgTable(
  "game_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id),
    gameVersion: integer("game_version").notNull(),
    mode: text("mode").$type<"assessment" | "practice">().notNull(),
    /** Game config, e.g. { rows, cols } for a custom Practice grid. */
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    seed: text("seed").notNull(),
    /** null = untimed. */
    durationMs: integer("duration_ms"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    endedAt: timestamp("ended_at"),
    finalLevel: integer("final_level"),
    totalScore: integer("total_score").notNull().default(0),
    status: text("status").$type<"active" | "finished">().notNull().default("active"),
    /** Set when a submission looked implausible; excluded from bests and leaderboards. */
    flagged: boolean("flagged").notNull().default(false),
  },
  (t) => [index("game_sessions_user_idx").on(t.userId, t.startedAt)],
);

export const levelAttempts = pgTable(
  "level_attempts",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),
    attempt: integer("attempt").notNull(),
    level: integer("level").notNull(),
    passed: boolean("passed").notNull(),
    points: integer("points").notNull(),
    avgRtMs: integer("avg_rt_ms"),
    /** The game's full LevelResult (recall/distractor counts etc.). */
    result: jsonb("result").$type<Record<string, unknown>>().notNull(),
    /** What the player submitted. */
    responses: jsonb("responses").$type<Record<string, unknown>>().notNull(),
    flags: text("flags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("level_attempts_session_attempt_idx").on(t.sessionId, t.attempt)],
);

export const userGameProgress = pgTable(
  "user_game_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id),
    tutorialCompleted: boolean("tutorial_completed").notNull().default(false),
    bestScore: integer("best_score").notNull().default(0),
    bestLevel: integer("best_level").notNull().default(0),
    sessionsPlayed: integer("sessions_played").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.gameId] })],
);

export const authSchema = { user, session, account, verification };
