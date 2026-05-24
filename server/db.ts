import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  profiles,
  generations,
  credits,
  postabilityFeedback,
  type InsertProfile,
  type InsertGeneration,
  type InsertCredits,
  type InsertPostabilityFeedback,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function getProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertProfile(data: InsertProfile) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(profiles)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        archetype: data.archetype,
        mood: data.mood,
        onboardingComplete: data.onboardingComplete,
      },
    });
  return getProfile(data.userId);
}

// ─── Generations ──────────────────────────────────────────────────────────────

export async function createGeneration(data: InsertGeneration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(generations).values(data);
  const result = await db
    .select()
    .from(generations)
    .where(eq(generations.userId, data.userId))
    .orderBy(desc(generations.createdAt))
    .limit(1);
  return result[0];
}

export async function getUserGenerations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(generations)
    .where(eq(generations.userId, userId))
    .orderBy(desc(generations.createdAt));
}

export async function updateGenerationHook(generationId: number, selectedHook: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(generations)
    .set({ selectedHook })
    .where(eq(generations.id, generationId));
}

// ─── Credits ──────────────────────────────────────────────────────────────────

export async function getCredits(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(credits).where(eq(credits.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function ensureCredits(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getCredits(userId);
  if (!existing) {
    await db.insert(credits).values({ userId, creditsRemaining: 5, totalUsed: 0, tier: "free" });
    return getCredits(userId);
  }
  return existing;
}

export async function decrementCredit(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await ensureCredits(userId);
  if (!current || current.creditsRemaining <= 0) {
    throw new Error("No credits remaining");
  }
  await db
    .update(credits)
    .set({
      creditsRemaining: current.creditsRemaining - 1,
      totalUsed: current.totalUsed + 1,
    })
    .where(eq(credits.userId, userId));
  return getCredits(userId);
}

// ─── Postability Feedback ─────────────────────────────────────────────────────

export async function savePostabilityFeedback(data: InsertPostabilityFeedback) {
  const db = await getDb();
  if (!db) return;
  await db.insert(postabilityFeedback).values(data);
}
