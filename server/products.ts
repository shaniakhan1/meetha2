/**
 * Meetha Stripe product and price IDs.
 * All IDs are live-mode values - Stripe sandbox uses the same IDs.
 */

export const STRIPE_PRODUCTS = {
  retrain: {
    productId: "prod_UaOIpQm866aJwC",
    priceId: "price_1TbDWGPMV5P3vLteBwKvgZKl",
    amount: 1900, // $19.00 USD
    label: "Meetha Retrain",
    description: "Retrain your personal AI model with new photos. One retrain credit.",
  },
} as const;
