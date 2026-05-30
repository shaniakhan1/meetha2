/**
 * Meetha Auth - powered by Supabase Auth.
 * Replaces Manus OAuth entirely.
 *
 * Flow:
 *   1. Client calls POST /api/auth/magic-link with { email }
 *   2. Supabase sends a magic link email to the user
 *   3. User clicks the link → redirected to /auth/callback?token_hash=...&type=magiclink
 *   4. Client exchanges the token hash for a session via Supabase JS SDK
 *   5. Client sends the access_token to POST /api/auth/session to set a server-side JWT cookie
 *   6. All subsequent requests use the cookie for auth (verified server-side)
 */
import { createClient } from "@supabase/supabase-js";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { ENV } from "./env";
import * as db from "../db";
import type { DbUser } from "../db";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { sendMagicLinkEmail } from "./email";

// ─── Supabase Admin Client ────────────────────────────────────────────────────

function getSupabaseAdmin() {
  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}

// ─── JWT Session ──────────────────────────────────────────────────────────────

function getSessionSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createSessionToken(userId: string, email: string): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);

  return new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSessionSecret());
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<{ sub: string; email: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), { algorithms: ["HS256"] });
    const sub = payload.sub as string;
    const email = payload.email as string;
    if (!sub) return null;
    return { sub, email };
  } catch {
    return null;
  }
}

// ─── Request Authentication ───────────────────────────────────────────────────

export async function authenticateRequest(req: Request): Promise<DbUser | null> {
  const cookieHeader = req.headers.cookie;
  const cookies = cookieHeader ? parseCookieHeader(cookieHeader) : {};
  const sessionToken = cookies[COOKIE_NAME];

  const session = await verifySessionToken(sessionToken);
  if (!session) return null;

  // session.sub is the Supabase auth user ID (UUID), stored as open_id
  const user = await db.getUserByOpenId(session.sub);
  return user;
}

// ─── Express Route Handlers ───────────────────────────────────────────────────

/**
 * POST /api/auth/magic-link
 * Body: { email: string }
 * Triggers a Supabase magic link email.
 */
export async function handleMagicLink(req: Request, res: Response) {
  const { email, redirectTo, referralCode } = req.body as { email?: string; redirectTo?: string; referralCode?: string };
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required" });
  }

  const supabase = getSupabaseAdmin();
  const siteUrl = redirectTo || `${req.protocol}://${req.get("host")}`;
  const callbackUrl = `${siteUrl}/auth/callback`;

  const { data: linkData, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: callbackUrl },
  });

  if (error || !linkData?.properties?.action_link) {
    console.error("[Auth] Magic link error:", error?.message);
    return res.status(500).json({ error: "Failed to generate magic link" });
  }

  // Send the magic link via Resend (replaces Supabase's built-in email)
  try {
    await sendMagicLinkEmail({
      to: email,
      magicLink: linkData.properties.action_link,
    });
  } catch (emailErr) {
    console.error("[Auth] Resend email error:", emailErr);
    return res.status(500).json({ error: "Failed to send magic link email" });
  }

  // If a referral code was provided, create a pending referral row
  if (referralCode) {
    try {
      const referrer = await db.getUserByReferralCode(referralCode);
      if (referrer) {
        await db.createReferral({ referrerUserId: referrer.id, referredEmail: email.toLowerCase() });
      }
    } catch {
      // Non-fatal: referral creation failure should not block sign-in
    }
  }

  return res.json({ success: true });
}

/**
 * POST /api/auth/session
 * Body: { access_token: string }
 * Verifies the Supabase access token, upserts the user, and sets a session cookie.
 */
export async function handleSetSession(req: Request, res: Response) {
  const { access_token, referralCode } = req.body as { access_token?: string; referralCode?: string };
  if (!access_token) {
    return res.status(400).json({ error: "access_token is required" });
  }

  try {
  const supabase = getSupabaseAdmin();
  const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(access_token);

  if (error || !supabaseUser) {
    console.error("[Auth] getUser failed:", error?.message);
    return res.status(401).json({ error: "Invalid access token" });
  }

  console.log("[Auth] supabaseUser id:", supabaseUser.id, "email:", supabaseUser.email);

  // Upsert user in our DB using Supabase auth UUID as open_id
  let dbUser: Awaited<ReturnType<typeof db.upsertUser>>["user"] = null;
  let isNew = false;
  try {
    const result = await db.upsertUser({
      openId: supabaseUser.id,
      email: supabaseUser.email ?? null,
      name: supabaseUser.user_metadata?.full_name ?? supabaseUser.email?.split("@")[0] ?? null,
      loginMethod: "magic_link",
    });
    dbUser = result.user;
    isNew = result.isNew;
  } catch (upsertErr) {
    console.error("[Auth] upsertUser threw:", upsertErr);
    return res.status(500).json({ error: "Failed to create user (upsert threw)" });
  }

  if (!dbUser) {
    console.error("[Auth] upsertUser returned null dbUser");
    return res.status(500).json({ error: "Failed to create user" });
  }

  // If a referral code was passed (Google OAuth path), create the pending referral now
  if (referralCode && supabaseUser.email) {
    try {
      const referrer = await db.getUserByReferralCode(referralCode);
      if (referrer && referrer.id !== dbUser.id) {
        await db.createReferral({ referrerUserId: referrer.id, referredEmail: supabaseUser.email.toLowerCase() });
      }
    } catch {
      // Non-fatal
    }
  }

  // Complete any pending referrals for this email (awards 3 credits to referrer, 1 credit to referred friend)
  if (supabaseUser.email) {
    try {
      await db.completeReferral(supabaseUser.email, dbUser.id);
    } catch {
      // Non-fatal: referral completion failure should not block sign-in
    }
  }

  // Send welcome email for brand-new signups (non-blocking)
  if (isNew && dbUser.email) {
    const { sendWelcomeEmail } = await import("./email");
    const baseUrl = ENV.isProduction ? "https://meetha.studio" : "http://localhost:3000";
    sendWelcomeEmail({ to: dbUser.email, name: dbUser.name ?? null, generateUrl: `${baseUrl}/generate`, templatesUrl: `${baseUrl}/templates` })
      .catch((err: unknown) => console.warn("[Auth] Welcome email failed (non-fatal):", err instanceof Error ? err.message : String(err)));
  }

  // Create our own JWT session cookie
  const sessionToken = await createSessionToken(supabaseUser.id, supabaseUser.email ?? "");
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

  return res.json({ success: true, user: dbUser });
  } catch (outerErr) {
    console.error("[Auth] handleSetSession unhandled error:", outerErr);
    return res.status(500).json({ error: "Internal server error during session setup" });
  }
}

/**
 * POST /api/auth/logout
 * Clears the session cookie.
 */
export function handleLogout(req: Request, res: Response) {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  return res.json({ success: true });
}

/**
 * GET /api/auth/me
 * Returns the current user from the session cookie.
 */
export async function handleMe(req: Request, res: Response) {
  const user = await authenticateRequest(req);
  if (!user) return res.status(401).json({ user: null });
  return res.json({ user });
}

/**
 * GET /api/auth/preview
 * Owner-only dev bypass: creates a real session cookie without requiring
 * magic link sign-in. Only works when NODE_ENV !== 'production'.
 * Upserts the owner user in the DB and sets the same JWT cookie as normal auth.
 */
export async function handlePreviewAuth(req: Request, res: Response) {
  if (ENV.isProduction) {
    return res.status(403).json({ error: "Preview mode is not available in production" });
  }

  const ownerOpenId = ENV.ownerOpenId || "preview-owner";

  // Upsert owner user
  const { user: dbUser } = await db.upsertUser({
    openId: ownerOpenId,
    email: "preview@meetha.app",
    name: "Preview Owner",
    loginMethod: "preview",
  });

  if (!dbUser) {
    return res.status(500).json({ error: "Failed to create preview user" });
  }

  const sessionToken = await createSessionToken(ownerOpenId, "preview@meetha.app");
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

  return res.json({ success: true, user: dbUser });
}
