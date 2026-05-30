/**
 * Meetha Stripe product and price IDs — live mode.
 * All IDs are live-mode values from the FLP Group Stripe account.
 * The STRIPE_SECRET_KEY must be a sk_live_* key for these to work.
 */

export const STRIPE_PRODUCTS = {
  retrain: {
    productId: "prod_UaOIpQm866aJwC",
    priceId: "price_1TbDWGPMV5P3vLteBwKvgZKl",
    amount: 1900, // $19.00 USD
    label: "Meetha Retrain",
    description: "Retrain your personal AI model with new photos. One retrain credit.",
  },

  sparkPack: {
    priceId: "price_1TcW5WPMV5P3vLteveuspoUz",
    amount: 500, // $5.00 USD
    credits: 3,
    label: "Spark Pack",
    description: "3 extra looks. One-time purchase.",
  },
} as const;

/**
 * Membership subscription price IDs (live mode).
 */
export const MEMBERSHIP_PRICES = {
  monthly: "price_1TafvrPMV5P3vLteuAss2HQB",      // $19/month
  annual: "price_1TbNCKPMV5P3vLterPzZXdJ6",       // $152/year
  annualLegacy: "price_1TbEW0PMV5P3vLtenCWJelOV",  // $182/year (legacy)
} as const;

/**
 * Pro tier price IDs (live mode) — not currently offered in the UI.
 * Kept here for webhook mapping completeness.
 */
export const PRO_PRICES = {
  monthly: "price_1Tafx2PMV5P3vLtewxC5j22r",      // $39/month
  annual: "price_1TbNCQPMV5P3vLteK2hNyr5X",       // $252/year
  annualLegacy: "price_1TbEW1PMV5P3vLteOLOovyKO",  // $374/year (legacy)
} as const;
