/**
 * Stripe webhook handler for the $19 retrain add-on.
 * Listens for checkout.session.completed events and records the purchase.
 */
import type { Request, Response } from "express";
import Stripe from "stripe";
import { getSupabase } from "./_core/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });

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

  // Test events - return verification response immediately
  if (event.id.startsWith("evt_test_")) {
    console.log("[StripeWebhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id ? parseInt(session.metadata.user_id) : null;

    if (!userId || !session.id) {
      console.warn("[StripeWebhook] Missing user_id or session id in checkout session");
      return res.json({ received: true });
    }

    try {
      const sb = getSupabase() as any;
      // Idempotent - upsert on stripeSessionId unique constraint
      const { error } = await sb
        .from("retrain_purchases")
        .upsert(
          { userId, stripeSessionId: session.id, paidAt: new Date().toISOString() },
          { onConflict: "stripeSessionId", ignoreDuplicates: true }
        );
      if (error) throw error;
      console.log(`[StripeWebhook] Retrain purchase recorded for user ${userId}, session ${session.id}`);
    } catch (err: any) {
      console.error("[StripeWebhook] DB insert failed:", err.message);
    }
  }

  return res.json({ received: true });
}

/**
 * Create a Stripe Checkout Session for the $19 retrain add-on.
 * Called from the tRPC router.
 */
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
        price: "price_1TbDWGPMV5P3vLteBwKvgZKl",
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

/**
 * Check if a user has an unused retrain purchase.
 */
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

/**
 * Mark the most recent unused retrain purchase as used.
 */
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
