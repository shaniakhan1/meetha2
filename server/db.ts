/**
 * Meetha database helpers — powered by Supabase Postgres.
 * All queries use the service role client (server-side only).
 * We cast the Supabase client as `any` for query builder calls since we
 * are not using generated Supabase types — all row types are defined below.
 */
import { getSupabase } from "./_core/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DbUser = {
  id: number;
  open_id: string;
  name: string | null;
  email: string | null;
  login_method: string | null;
  role: "user" | "admin";
  created_at: string;
  updated_at: string;
  last_signed_in: string;
};

export type DbProfile = {
  id: number;
  user_id: number;
  archetype: string;
  mood: string;
  onboarding_complete: boolean;
  aesthetic_descriptors: string | null;
  created_at: string;
  updated_at: string;
};

export type DbCredits = {
  id: number;
  user_id: number;
  credits_remaining: number;
  total_used: number;
  tier: "free" | "starter" | "pro";
  updated_at: string;
};

export type DbGeneration = {
  id: number;
  user_id: number;
  image_url: string;
  image_key: string;
  archetype: string;
  mood: string;
  platform: string;
  scene_category: string | null;
  hooks: string;
  caption: string;
  selected_hook: string | null;
  created_at: string;
};

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(data: {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: "user" | "admin";
}): Promise<DbUser | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const now = new Date().toISOString();

  const { data: existing } = await sb
    .from("users")
    .select("*")
    .eq("open_id", data.openId)
    .single();

  if (existing) {
    const row = existing as DbUser;
    const { data: updated } = await sb
      .from("users")
      .update({
        name: data.name ?? row.name,
        email: data.email ?? row.email,
        login_method: data.loginMethod ?? row.login_method,
        last_signed_in: now,
        updated_at: now,
      })
      .eq("open_id", data.openId)
      .select()
      .single();
    return (updated as DbUser) ?? null;
  }

  const { data: inserted } = await sb
    .from("users")
    .insert({
      open_id: data.openId,
      name: data.name ?? null,
      email: data.email ?? null,
      login_method: data.loginMethod ?? null,
      role: data.role ?? "user",
      last_signed_in: now,
    })
    .select()
    .single();
  return (inserted as DbUser) ?? null;
}

export async function getUserByOpenId(openId: string): Promise<DbUser | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data } = await sb
    .from("users")
    .select("*")
    .eq("open_id", openId)
    .single();
  return (data as DbUser) ?? null;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function getProfile(userId: number): Promise<DbProfile | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data } = await sb
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  return (data as DbProfile) ?? null;
}

export async function upsertProfile(data: {
  userId: number;
  archetype: string;
  mood: string;
  onboardingComplete?: boolean;
  aestheticDescriptors?: string | null;
}): Promise<DbProfile | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const now = new Date().toISOString();

  const { data: existing } = await sb
    .from("profiles")
    .select("id")
    .eq("user_id", data.userId)
    .single();

  if (existing) {
    const { data: updated } = await sb
      .from("profiles")
      .update({
        archetype: data.archetype,
        mood: data.mood,
        onboarding_complete: data.onboardingComplete ?? true,
        ...(data.aestheticDescriptors !== undefined ? { aesthetic_descriptors: data.aestheticDescriptors } : {}),
        updated_at: now,
      })
      .eq("user_id", data.userId)
      .select()
      .single();
    return (updated as DbProfile) ?? null;
  }

  const { data: inserted } = await sb
    .from("profiles")
    .insert({
      user_id: data.userId,
      archetype: data.archetype,
      mood: data.mood,
      onboarding_complete: data.onboardingComplete ?? true,
      ...(data.aestheticDescriptors !== undefined ? { aesthetic_descriptors: data.aestheticDescriptors } : {}),
    })
    .select()
    .single();
  return (inserted as DbProfile) ?? null;
}

export async function updateAestheticDescriptors(
  userId: number,
  descriptors: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const now = new Date().toISOString();
  await sb
    .from("profiles")
    .update({ aesthetic_descriptors: descriptors, updated_at: now })
    .eq("user_id", userId);
}

// ─── Credits ──────────────────────────────────────────────────────────────────

export async function getCredits(userId: number): Promise<DbCredits | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data } = await sb
    .from("credits")
    .select("*")
    .eq("user_id", userId)
    .single();
  return (data as DbCredits) ?? null;
}

export async function ensureCredits(userId: number): Promise<DbCredits> {
  const existing = await getCredits(userId);
  if (existing) return existing;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data } = await sb
    .from("credits")
    .insert({ user_id: userId, credits_remaining: 5, total_used: 0, tier: "free" })
    .select()
    .single();
  return data as DbCredits;
}

export async function decrementCredit(userId: number): Promise<void> {
  const credits = await getCredits(userId);
  if (!credits) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  await sb
    .from("credits")
    .update({
      credits_remaining: Math.max(0, credits.credits_remaining - 1),
      total_used: credits.total_used + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

// ─── Generations ──────────────────────────────────────────────────────────────

export async function createGeneration(data: {
  userId: number;
  imageUrl: string;
  imageKey: string;
  archetype: string;
  mood: string;
  platform: string;
  sceneCategory: string | null;
  hooks: string;
  caption: string;
}): Promise<DbGeneration> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data: inserted, error } = await sb
    .from("generations")
    .insert({
      user_id: data.userId,
      image_url: data.imageUrl,
      image_key: data.imageKey,
      archetype: data.archetype,
      mood: data.mood,
      platform: data.platform,
      scene_category: data.sceneCategory,
      hooks: data.hooks,
      caption: data.caption,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to save generation: ${error.message}`);
  return inserted as DbGeneration;
}

export async function getUserGenerations(userId: number): Promise<DbGeneration[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data } = await sb
    .from("generations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as DbGeneration[]) ?? [];
}

export async function updateGenerationHook(data: {
  generationId: number;
  selectedHook: string;
}): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  await sb
    .from("generations")
    .update({ selected_hook: data.selectedHook })
    .eq("id", data.generationId);
}

// ─── Postability Feedback ─────────────────────────────────────────────────────

export async function savePostabilityFeedback(data: {
  generationId: number;
  userId: number;
  response: "yes" | "maybe" | "no";
}): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  await sb.from("postability_feedback").insert({
    generation_id: data.generationId,
    user_id: data.userId,
    response: data.response,
  });
}
