import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Profiles ────────────────────────────────────────────────────────────────

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  archetype: mysqlEnum("archetype", [
    "luxury_minimal",
    "elegant_chaos",
    "soft_power",
    "dark_feminine",
    "ethereal",
  ]),
  mood: mysqlEnum("mood", ["soft", "magnetic", "grounded", "untamed"]),
  onboardingComplete: boolean("onboardingComplete").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

// ─── Generations ─────────────────────────────────────────────────────────────

export const generations = mysqlTable("generations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  imageUrl: text("imageUrl").notNull(),
  imageKey: text("imageKey").notNull(),
  archetype: varchar("archetype", { length: 64 }).notNull(),
  mood: varchar("mood", { length: 64 }).notNull(),
  platform: mysqlEnum("platform", ["tiktok", "reels", "stories"]).notNull(),
  sceneCategory: varchar("sceneCategory", { length: 64 }),
  hooks: text("hooks").notNull(), // JSON array of 3 strings
  selectedHook: text("selectedHook"),
  caption: text("caption").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Generation = typeof generations.$inferSelect;
export type InsertGeneration = typeof generations.$inferInsert;

// ─── Credits ─────────────────────────────────────────────────────────────────

export const credits = mysqlTable("credits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  creditsRemaining: int("creditsRemaining").default(5).notNull(),
  totalUsed: int("totalUsed").default(0).notNull(),
  tier: mysqlEnum("tier", ["free", "starter", "pro"]).default("free").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Credits = typeof credits.$inferSelect;
export type InsertCredits = typeof credits.$inferInsert;

// ─── Postability Feedback ─────────────────────────────────────────────────────

export const postabilityFeedback = mysqlTable("postability_feedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  generationId: int("generationId").notNull(),
  response: mysqlEnum("response", ["yes", "maybe", "no"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PostabilityFeedback = typeof postabilityFeedback.$inferSelect;
export type InsertPostabilityFeedback = typeof postabilityFeedback.$inferInsert;
