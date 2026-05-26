/**
 * Meetha database helpers - powered by Supabase (MySQL/TiDB via Manus).
 * All queries use the service role client (server-side only).
 * Column names match the actual DB schema (camelCase as defined in drizzle/schema.ts).
 */
import { getSupabase } from "./_core/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DbUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  referral_code: string | null;
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
};

export type DbProfile = {
  id: number;
  userId: number;
  archetype: string;
  mood: string;
  onboardingComplete: boolean;
  // These columns were added directly in Supabase (snake_case)
  aesthetic_descriptors: string | null;
  aesthetic_preview_url: string | null;
  reference_image_urls: string[] | null;
  niche: string | null;
  audience: string | null;
  voice_style: string | null;
  share_badge_enabled: boolean | null;
  lora_weights_url: string | null;
  lora_trigger_phrase: string | null;
  lora_training_request_id: string | null;
  lora_status: "training" | "ready" | "failed" | null;
  lora_physical_descriptors: string | null;
  body_type: string | null;
  aesthetic_brief: AestheticBrief | null;
  createdAt: string;
  updatedAt: string;
};

export type AestheticBrief = {
  palette: string;
  metals: string;
  fabrics: string;
  makeup: string;
  lighting: string;
  hair: string;
  generatedAt: string;
};

export type DbCredits = {
  id: number;
  userId: number;
  creditsRemaining: number;
  totalUsed: number;
  tier: "free" | "starter" | "pro";
  free_lora_used: boolean;
  updatedAt: string;
};

export type DbGeneration = {
  id: number;
  userId: number;
  imageUrl: string;
  imageKey: string;
  archetype: string;
  mood: string;
  platform: string;
  sceneCategory: string | null;
  hooks: string;
  caption: string;
  selectedHook: string | null;
  createdAt: string;
  archived: boolean;
  archivedAt: string | null;
};

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(data: {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: "user" | "admin";
}): Promise<{ user: DbUser | null; isNew: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const now = new Date().toISOString();

  const { data: existing } = await sb
    .from("users")
    .select("*")
    .eq("openId", data.openId)
    .single();

  if (existing) {
    const row = existing as DbUser;
    const { data: updated } = await sb
      .from("users")
      .update({
        name: data.name ?? row.name,
        email: data.email ?? row.email,
        loginMethod: data.loginMethod ?? row.loginMethod,
        lastSignedIn: now,
        updatedAt: now,
      })
      .eq("openId", data.openId)
      .select()
      .single();
    return { user: (updated as DbUser) ?? null, isNew: false };
  }

  const { data: inserted } = await sb
    .from("users")
    .insert({
      openId: data.openId,
      name: data.name ?? null,
      email: data.email ?? null,
      loginMethod: data.loginMethod ?? null,
      role: data.role ?? "user",
      lastSignedIn: now,
    })
    .select()
    .single();
  return { user: (inserted as DbUser) ?? null, isNew: true };
}

export async function getUserByOpenId(openId: string): Promise<DbUser | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data } = await sb
    .from("users")
    .select("*")
    .eq("openId", openId)
    .single();
  return (data as DbUser) ?? null;
}

export async function getUserById(userId: number): Promise<DbUser | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data } = await sb
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return (data as DbUser) ?? null;
}

export async function deleteUserAccount(userId: number, openId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;

  // Delete in dependency order so FK constraints are satisfied
  const steps: Array<{ label: string; result: Promise<{ error: unknown }> }> = [
    { label: "referrals", result: sb.from("referrals").delete().or(`referrerUserId.eq.${userId},referredUserId.eq.${userId}`) },
    { label: "generations", result: sb.from("generations").delete().eq("userId", userId) },
    { label: "credits", result: sb.from("credits").delete().eq("userId", userId) },
    { label: "profiles", result: sb.from("profiles").delete().eq("userId", userId) },
    { label: "users", result: sb.from("users").delete().eq("id", userId) },
  ];

  for (const step of steps) {
    const { error } = await step.result;
    if (error) throw new Error(`Failed to delete ${step.label}: ${(error as Error).message ?? String(error)}`);
  }

  // Delete the Supabase auth user - non-fatal if the auth record is already gone
  const { error: authErr } = await sb.auth.admin.deleteUser(openId);
  if (authErr && !(authErr as { message?: string }).message?.includes("not found")) {
    throw new Error(`Failed to delete auth user: ${(authErr as Error).message ?? String(authErr)}`);
  }
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function getProfile(userId: number): Promise<DbProfile | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data } = await sb
    .from("profiles")
    .select("*")
    .eq("userId", userId)
    .single();
  return (data as DbProfile) ?? null;
}

export async function upsertProfile(data: {
  userId: number;
  archetype: string;
  mood: string;
  onboardingComplete?: boolean;
  aestheticDescriptors?: string | null;
  niche?: string | null;
  audience?: string | null;
  voiceStyle?: string | null;
}): Promise<DbProfile | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const now = new Date().toISOString();

  const { data: existing } = await sb
    .from("profiles")
    .select("id")
    .eq("userId", data.userId)
    .single();

  if (existing) {
    const { data: updated } = await sb
      .from("profiles")
      .update({
        archetype: data.archetype,
        mood: data.mood,
        onboardingComplete: data.onboardingComplete ?? true,
        ...(data.aestheticDescriptors !== undefined ? { aesthetic_descriptors: data.aestheticDescriptors } : {}),
        ...(data.niche !== undefined ? { niche: data.niche } : {}),
        ...(data.audience !== undefined ? { audience: data.audience } : {}),
        ...(data.voiceStyle !== undefined ? { voice_style: data.voiceStyle } : {}),
        updatedAt: now,
      })
      .eq("userId", data.userId)
      .select()
      .single();
    return (updated as DbProfile) ?? null;
  }

  const { data: inserted } = await sb
    .from("profiles")
    .insert({
      userId: data.userId,
      archetype: data.archetype,
      mood: data.mood,
      onboardingComplete: data.onboardingComplete ?? true,
      ...(data.aestheticDescriptors !== undefined ? { aesthetic_descriptors: data.aestheticDescriptors } : {}),
      ...(data.niche !== undefined ? { niche: data.niche } : {}),
      ...(data.audience !== undefined ? { audience: data.audience } : {}),
      ...(data.voiceStyle !== undefined ? { voice_style: data.voiceStyle } : {}),
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
    .update({ aesthetic_descriptors: descriptors, updatedAt: now })
    .eq("userId", userId);
}

export async function updateShareBadge(
  userId: number,
  enabled: boolean
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const now = new Date().toISOString();
  await sb
    .from("profiles")
    .update({ share_badge_enabled: enabled, updatedAt: now })
    .eq("userId", userId);
}

export async function updateAestheticPreviewUrl(
  userId: number,
  url: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const now = new Date().toISOString();
  await sb
    .from("profiles")
    .update({ aesthetic_preview_url: url, updatedAt: now })
    .eq("userId", userId);
}

export async function updateReferenceImageUrls(
  userId: number,
  urls: string[]
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const now = new Date().toISOString();
  await sb
    .from("profiles")
    .update({ reference_image_urls: urls, updatedAt: now })
    .eq("userId", userId);
}

export async function updateAestheticBrief(
  userId: number,
  brief: AestheticBrief
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const now = new Date().toISOString();
  await sb
    .from("profiles")
    .update({ aesthetic_brief: brief, updatedAt: now })
    .eq("userId", userId);
}

export async function updateBodyType(
  userId: number,
  bodyType: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const now = new Date().toISOString();
  await sb
    .from("profiles")
    .update({ body_type: bodyType, updatedAt: now })
    .eq("userId", userId);
}

// ─── Credits ──────────────────────────────────────────────────────────────────

export async function getCredits(userId: number): Promise<DbCredits | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data } = await sb
    .from("credits")
    .select("*")
    .eq("userId", userId)
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
    .insert({ userId, creditsRemaining: 1, totalUsed: 0, tier: "free" })
    .select()
    .single();
  return data as DbCredits;
}

export async function decrementCredit(userId: number, cost = 1): Promise<void> {
  const credits = await getCredits(userId);
  if (!credits) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  await sb
    .from("credits")
    .update({
      creditsRemaining: Math.max(0, credits.creditsRemaining - cost),
      totalUsed: credits.totalUsed + cost,
      updatedAt: new Date().toISOString(),
    })
    .eq("userId", userId);
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
      userId: data.userId,
      imageUrl: data.imageUrl,
      imageKey: data.imageKey,
      archetype: data.archetype,
      mood: data.mood,
      platform: data.platform,
      sceneCategory: data.sceneCategory,
      hooks: data.hooks,
      caption: data.caption,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to save generation: ${error.message}`);
  return inserted as DbGeneration;
}

/** Fetch a paginated page of non-archived generations for a user. */
export async function getUserGenerations(
  userId: number,
  opts: { limit?: number; offset?: number } = {}
): Promise<DbGeneration[]> {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data } = await sb
    .from("generations")
    .select("*")
    .eq("userId", userId)
    .eq("archived", false)
    .order("createdAt", { ascending: false })
    .range(offset, offset + limit - 1);
  return (data as DbGeneration[]) ?? [];
}

/** Count total non-archived generations for a user (for pagination UI). */
export async function countUserGenerations(userId: number): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { count } = await sb
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("userId", userId)
    .eq("archived", false);
  return (count as number) ?? 0;
}

/** Archive generations older than cutoffDays for a specific user. Returns count archived. */
export async function archiveOldGenerations(
  userId: number,
  cutoffDays: number
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - cutoffDays);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data } = await sb
    .from("generations")
    .update({ archived: true, archivedAt: new Date().toISOString() })
    .eq("userId", userId)
    .eq("archived", false)
    .lt("createdAt", cutoffDate.toISOString())
    .select("id");
  return (data as { id: number }[])?.length ?? 0;
}

export async function updateGenerationHook(data: {
  generationId: number;
  selectedHook: string;
}): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  await sb
    .from("generations")
    .update({ selectedHook: data.selectedHook })
    .eq("id", data.generationId);
}

// ─── Referrals ───────────────────────────────────────────────────────────────

export type DbReferral = {
  id: number;
  referrer_user_id: number;
  referred_email: string;
  referred_user_id: number | null;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
};

/** Generate a short unique referral code for a user (8 chars, alphanumeric). */
function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Get or create a referral code for a user. */
export async function getOrCreateReferralCode(userId: number): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data: user } = await sb.from("users").select("referral_code").eq("id", userId).single();
  if (user?.referral_code) return user.referral_code as string;

  // Generate a unique code
  let code = generateReferralCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data: existing } = await sb.from("users").select("id").eq("referral_code", code).single();
    if (!existing) break;
    code = generateReferralCode();
    attempts++;
  }

  await sb.from("users").update({ referral_code: code }).eq("id", userId);
  return code;
}

/** Look up a user by referral code. */
export async function getUserByReferralCode(code: string): Promise<DbUser | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data } = await sb.from("users").select("*").eq("referral_code", code).single();
  return (data as DbUser) ?? null;
}

/** Record a referral invite (referrer invites an email). */
export async function createReferral(data: {
  referrerUserId: number;
  referredEmail: string;
}): Promise<DbReferral | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data: inserted } = await sb
    .from("referrals")
    .upsert(
      { referrer_user_id: data.referrerUserId, referred_email: data.referredEmail.toLowerCase() },
      { onConflict: "referrer_user_id,referred_email", ignoreDuplicates: true }
    )
    .select()
    .single();
  return (inserted as DbReferral) ?? null;
}

/** Complete a referral when referred user signs up. Awards 3 credits to both parties. */
export async function completeReferral(referredEmail: string, referredUserId: number): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const now = new Date().toISOString();

  const { data: referrals } = await sb
    .from("referrals")
    .select("*")
    .eq("referred_email", referredEmail.toLowerCase())
    .eq("completed", false);

  if (!referrals || referrals.length === 0) return;

  for (const referral of referrals as DbReferral[]) {
    await sb
      .from("referrals")
      .update({ completed: true, referred_user_id: referredUserId, completed_at: now })
      .eq("id", referral.id);

    const referrerCredits = await getCredits(referral.referrer_user_id);
    if (referrerCredits) {
      await sb
        .from("credits")
        .update({
          creditsRemaining: referrerCredits.creditsRemaining + 3,
          updatedAt: now,
        })
        .eq("userId", referral.referrer_user_id);
    }
  }

  const referredCredits = await getCredits(referredUserId);
  if (referredCredits) {
    await sb
      .from("credits")
      .update({
        creditsRemaining: referredCredits.creditsRemaining + 3,
        updatedAt: now,
      })
      .eq("userId", referredUserId);
  }
}

/** Get all referrals made by a user. */
export async function getReferralsByUser(userId: number): Promise<DbReferral[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data } = await sb
    .from("referrals")
    .select("*")
    .eq("referrer_user_id", userId)
    .order("created_at", { ascending: false });
  return (data as DbReferral[]) ?? [];
}

// ─── LoRA Portrait ───────────────────────────────────────────────────────────

export async function updateLoraProfile(userId: number, data: {
  loraWeightsUrl?: string | null;
  loraTriggerPhrase?: string | null;
  loraTrainingRequestId?: string | null;
  loraStatus?: "training" | "ready" | "failed" | null;
  loraPhysicalDescriptors?: string | null;
}): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updatedAt: now };
  if (data.loraWeightsUrl !== undefined) patch.lora_weights_url = data.loraWeightsUrl;
  if (data.loraTriggerPhrase !== undefined) patch.lora_trigger_phrase = data.loraTriggerPhrase;
  if (data.loraTrainingRequestId !== undefined) patch.lora_training_request_id = data.loraTrainingRequestId;
  if (data.loraStatus !== undefined) patch.lora_status = data.loraStatus;
  if (data.loraPhysicalDescriptors !== undefined) patch.lora_physical_descriptors = data.loraPhysicalDescriptors;
  await sb.from("profiles").update(patch).eq("userId", userId);
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
