/**
 * Stripe webhook handler.
 * Handles:
 *   - checkout.session.completed (mode=payment, purchase_type=retrain)      → retrain add-on
 *   - checkout.session.completed (mode=payment, purchase_type=credit_pack)  → Spark Pack top-up
 *   - checkout.session.completed (mode=subscription) → Membership activation
 *   - customer.subscription.updated / deleted → tier sync
 */
import type { Request, Response } from "express";
import Stripe from "stripe";
import { getSupabase } from "./_core/supabase";
import { PLAN_GENERATION_LIMITS } from "../shared/types";
import { getUserById, getRecoveryEmailRecord, markRecoveryBonusUsed } from "./db";
import { sendMembershipActivatedEmail } from "./_core/email";
import { STRIPE_PRODUCTS, MEMBERSHIP_PRICES, PRO_PRICES } from "./products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });

// ─── Credit pack price → credits mapping ────────────────────────────────────
const CREDIT_PACK_CREDITS: Record<string, number> = {
  [STRIPE_PRODUCTS.sparkPack.priceId]: STRIPE_PRODUCTS.sparkPack.credits,
};

// ─── Price → tier mapping ──────────────────────────────────────────────────────
// Membership monthly + annual → "starter" (25 gens)
// Pro monthly + annual → "pro" (25 gens)
const PRICE_TO_TIER: Record<string, "starter" | "pro"> = {
  [MEMBERSHIP_PRICES.monthly]: "starter",      // Membership $19/month
  [MEMBERSHIP_PRICES.annual]: "starter",       // Membership $152/year
  [MEMBERSHIP_PRICES.annualLegacy]: "starter", // Membership $182/year (legacy)
  [PRO_PRICES.monthly]: "pro",                 // Pro $39/month
  [PRO_PRICES.annual]: "pro",                  // Pro $252/year
  [PRO_PRICES.annualLegacy]: "pro",            // Pro $374/year (legacy)
};

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function activateSubscription(userId: number, tier: "starter" | "pro"): Promise<void> {
  const sb = getSupabase() as any;
  const credits = PLAN_GENERATION_LIMITS[tier] ?? 25;

  // Get current credits row
  const { data: existing } = await sb
    .from("credits")
    .select("credits_remaining, tier")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    // No credits row yet — create it
    await sb.from("credits").insert({
      user_id: userId,
      credits_remaining: credits,
      total_used: 0,
      tier,
    });
  } else {
    // Only upgrade — never downgrade credits_remaining if already higher
    const newRemaining = Math.max(existing.credits_remaining, credits);
    await sb.from("credits").update({
      credits_remaining: newRemaining,
      tier,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
  }

  console.log(`[StripeWebhook] Activated ${tier} for user ${userId} (${credits} credits)`);
}

async function deactivateSubscription(userId: number): Promise<void> {
  const sb = getSupabase() as any;
  // Downgrade to free — keep remaining credits but cap at 1 and set tier=free
  const { data: existing } = await sb
    .from("credits")
    .select("credits_remaining")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await sb.from("credits").update({
      tier: "free",
      credits_remaining: Math.min(existing.credits_remaining, 1),
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
  }

  console.log(`[StripeWebhook] Deactivated subscription for user ${userId}`);
}

async function getUserIdByStripeCustomer(customerId: string): Promise<number | null> {
  const sb = getSupabase() as any;
  const { data } = await sb
    .from("credits")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function saveStripeCustomerId(userId: number, customerId: string): Promise<void> {
  const sb = getSupabase() as any;
  await sb.from("credits").update({
    stripe_customer_id: customerId,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
}

// ─── Main webhook handler ─────────────────────────────────────────────────────

export async function handleStripeRetrainWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("[StripeWebhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Test events — return verification response immediately
  if (event.id.startsWith("evt_test_")) {
    console.log("[StripeWebhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  console.log(`[StripeWebhook] Event: ${event.type} (${event.id})`);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id ? parseInt(session.metadata.user_id) : null;

      if (!userId) {
        console.warn("[StripeWebhook] Missing user_id in checkout session metadata");
        return res.json({ received: true });
      }

      // Save stripe_customer_id for future subscription events
      if (session.customer && typeof session.customer === "string") {
        await saveStripeCustomerId(userId, session.customer);
      }

      if (session.mode === "subscription") {
        // Membership subscription activated
        // Get the price ID from the line items to determine tier
        let tier: "starter" | "pro" = "starter"; // default to starter
        if (session.metadata?.price_id) {
          tier = PRICE_TO_TIER[session.metadata.price_id] ?? "starter";
        }
        await activateSubscription(userId, tier);
        console.log(`[StripeWebhook] Subscription checkout completed for user ${userId}, tier=${tier}`);

        // Recovery bonus: add 3 extra credits if this user received a recovery email
        getRecoveryEmailRecord(userId).then(async (record) => {
          if (record && !record.bonus_on_purchase_used) {
            const sb = getSupabase() as any;
            const { data: existing } = await sb
              .from("credits")
              .select("credits_remaining")
              .eq("user_id", userId)
              .maybeSingle();
            const current = existing?.credits_remaining ?? 0;
            await sb.from("credits").update({
              credits_remaining: current + 3,
              updated_at: new Date().toISOString(),
            }).eq("user_id", userId);
            await markRecoveryBonusUsed(userId);
            console.log(`[StripeWebhook] Recovery bonus: +3 credits for user ${userId}`);
          }
        }).catch((err) =>
          console.warn("[StripeWebhook] Recovery bonus check error (non-fatal):", err instanceof Error ? err.message : String(err))
        );

        // Send membership-activated email (fire and forget, non-blocking)
        getUserById(userId).then(async (user) => {
          if (user?.email) {
            const origin = (session as any).success_url
              ? new URL((session as any).success_url).origin
              : "https://meetha.studio";
            await sendMembershipActivatedEmail({
              to: user.email,
              name: user.name ?? null,
              dashboardUrl: `${origin}/dashboard`,
            }).catch((err) =>
              console.warn("[StripeWebhook] Membership email send error (non-fatal):", err instanceof Error ? err.message : String(err))
            );
          }
        }).catch(() => { /* non-fatal */ });
      } else if (session.mode === "payment") {
        const purchaseType = session.metadata?.purchase_type;

        if (purchaseType === "credit_pack") {
          // Credit pack top-up — add credits directly to the user's balance
          const priceId = session.metadata?.price_id ?? "";
          const creditsToAdd = CREDIT_PACK_CREDITS[priceId] ?? 3;
          const sb = getSupabase() as any;
          const { data: existing } = await sb
            .from("credits")
            .select("credits_remaining")
            .eq("user_id", userId)
            .maybeSingle();
          const current = existing?.credits_remaining ?? 0;
          await sb.from("credits").update({
            credits_remaining: current + creditsToAdd,
            updated_at: new Date().toISOString(),
          }).eq("user_id", userId);
          console.log(`[StripeWebhook] Credit pack: +${creditsToAdd} credits for user ${userId} (price ${priceId})`);
        } else {
          // One-time retrain purchase
          const sb = getSupabase() as any;
          const { error } = await sb
            .from("retrain_purchases")
            .upsert(
              { userId, stripeSessionId: session.id, paidAt: new Date().toISOString() },
              { onConflict: "stripeSessionId", ignoreDuplicates: true }
            );
          if (error) throw error;
          console.log(`[StripeWebhook] Retrain purchase recorded for user ${userId}, session ${session.id}`);
        }
      }
    } else if (event.type === "invoice.paid") {
      // Subscription renewal — ensure credits are topped up
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) return res.json({ received: true });

      const userId = await getUserIdByStripeCustomer(customerId);
      if (!userId) {
        console.warn(`[StripeWebhook] No user found for Stripe customer ${customerId}`);
        return res.json({ received: true });
      }

      // Determine tier from subscription price
      let tier: "starter" | "pro" = "starter";
      const lineItems = (invoice as any).lines?.data ?? [];
      for (const item of lineItems) {
        const priceId = item.price?.id ?? item.pricing?.price_details?.price;
        if (priceId && PRICE_TO_TIER[priceId]) {
          tier = PRICE_TO_TIER[priceId];
          break;
        }
      }

      await activateSubscription(userId, tier);
      console.log(`[StripeWebhook] Invoice paid — credits refreshed for user ${userId}, tier=${tier}`);
    } else if (event.type === "customer.subscription.deleted") {
      // Subscription cancelled
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
      if (!customerId) return res.json({ received: true });

      const userId = await getUserIdByStripeCustomer(customerId);
      if (userId) {
        await deactivateSubscription(userId);
      }
    }
  } catch (err: any) {
    console.error("[StripeWebhook] Handler error:", err.message);
    // Still return 200 so Stripe doesn't retry
  }

  return res.json({ received: true });
}

// ─── Create subscription checkout session ────────────────────────────────────

export async function createSubscriptionCheckoutSession({
  userId,
  userEmail,
  userName,
  priceId,
  origin,
}: {
  userId: number;
  userEmail: string | null;
  userName: string | null;
  priceId: string;
  origin: string;
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: userEmail ?? undefined,
    client_reference_id: userId.toString(),
    metadata: {
      user_id: userId.toString(),
      customer_email: userEmail ?? "",
      customer_name: userName ?? "",
      price_id: priceId,
      purchase_type: "subscription",
    },
    allow_promotion_codes: true,
    success_url: `${origin}/dashboard?subscription=success`,
    cancel_url: `${origin}/dashboard?subscription=cancelled`,
  });

  return session.url!;
}

// ─── Retrain helpers (unchanged) ─────────────────────────────────────────────

export async function createRetrainCheckoutSession({
  userId,
  userEmail,
  userName,
  origin,
}: {
  userId: number;
  userEmail: string | null;
  userName: string | null;
  origin: string;
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price: STRIPE_PRODUCTS.retrain.priceId,
        quantity: 1,
      },
    ],
    customer_email: userEmail ?? undefined,
    client_reference_id: userId.toString(),
    metadata: {
      user_id: userId.toString(),
      customer_email: userEmail ?? "",
      customer_name: userName ?? "",
      purchase_type: "retrain",
    },
    allow_promotion_codes: true,
    success_url: `${origin}/profile?retrain=success`,
    cancel_url: `${origin}/profile?retrain=cancelled`,
  });

  return session.url!;
}

// ─── Credit pack checkout session ───────────────────────────────────────────

export async function createCreditPackCheckoutSession({
  userId,
  userEmail,
  userName,
  origin,
}: {
  userId: number;
  userEmail: string | null;
  userName: string | null;
  origin: string;
}): Promise<string> {
  const SPARK_PACK_PRICE_ID = STRIPE_PRODUCTS.sparkPack.priceId;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: SPARK_PACK_PRICE_ID, quantity: 1 }],
    customer_email: userEmail ?? undefined,
    client_reference_id: userId.toString(),
    metadata: {
      user_id: userId.toString(),
      customer_email: userEmail ?? "",
      customer_name: userName ?? "",
      price_id: SPARK_PACK_PRICE_ID,
      purchase_type: "credit_pack",
    },
    allow_promotion_codes: true,
    success_url: `${origin}/dashboard?credits=added`,
    cancel_url: `${origin}/dashboard`,
  });
  return session.url!;
}

// ─── Customer Portal session ────────────────────────────────────────────────

export async function createCustomerPortalSession({
  userId,
  returnUrl,
}: {
  userId: number;
  returnUrl: string;
}): Promise<string> {
  const sb = getSupabase() as any;
  const { data: row } = await sb
    .from("credits")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  const customerId: string | null = row?.stripe_customer_id ?? null;

  if (!customerId) {
    throw new Error("No Stripe customer found for this account. Please contact support.");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function hasUnusedRetrainPurchase(userId: number): Promise<boolean> {
  const sb = getSupabase() as any;
  const { data, error } = await sb
    .from("retrain_purchases")
    .select("id, usedAt")
    .eq("userId", userId)
    .is("usedAt", null)
    .limit(1);
  if (error) return false;
  return (data ?? []).length > 0;
}

export async function consumeRetrainPurchase(userId: number): Promise<void> {
  const sb = getSupabase() as any;
  const { data } = await sb
    .from("retrain_purchases")
    .select("id")
    .eq("userId", userId)
    .is("usedAt", null)
    .order("paidAt", { ascending: true })
    .limit(1);
  const row = (data ?? [])[0];
  if (!row) return;
  await sb
    .from("retrain_purchases")
    .update({ usedAt: new Date().toISOString() })
    .eq("id", row.id);
}
