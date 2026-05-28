/**
 * Silhouette styling tokens for Meetha.
 *
 * These are STYLING PREFERENCES, not biometric measurements.
 * They control clothing cuts, waist emphasis, silhouette framing, and pose guidance
 * so the AI styles the user the way she wants to be styled -- not how the base model defaults.
 *
 * The base model bias is: tall, slim, editorial model proportions.
 * These tokens counteract that bias and give users agency over their visual identity.
 */

export type SilhouetteChoice = "slim" | "athletic" | "curvy" | null;

export interface SilhouetteTokens {
  /** Short label shown in UI */
  label: string;
  /** One-line description shown in UI */
  description: string;
  /** Primary prompt modifier injected at the front of every generation */
  promptModifier: string;
  /** Additional styling guidance for clothing and tailoring */
  stylingGuidance: string;
  /** Camera framing and pose guidance */
  framingGuidance: string;
}

export const SILHOUETTE_TOKENS: Record<NonNullable<SilhouetteChoice>, SilhouetteTokens> = {
  slim: {
    label: "Slim",
    description: "Elongated, fashion-forward cuts with clean lines",
    promptModifier:
      "lean editorial silhouette, elongated proportions, fashion-forward styling, streamlined cuts, vertical lines, column silhouette",
    stylingGuidance:
      "sleek tailoring, straight-leg trousers, column dresses, minimal volume, clean structured cuts, monochromatic layering",
    framingGuidance:
      "full-length editorial framing, vertical composition, long lines emphasized, confident upright posture",
  },
  athletic: {
    label: "Athletic",
    description: "Strong, structured tailoring with confident proportions",
    promptModifier:
      "athletic strong silhouette, structured tailoring, confident proportions, powerful presence, defined shoulders, bold cuts",
    stylingGuidance:
      "structured blazers, wide-leg trousers, strong shoulders, tailored fits, bold geometric cuts, power dressing",
    framingGuidance:
      "confident stance, strong posture, dynamic framing, power pose, shoulders back, grounded presence",
  },
  curvy: {
    label: "Curvy",
    description: "Elegant silhouette with soft waist emphasis and luxury proportions",
    promptModifier:
      "curvy elegant silhouette, soft waist emphasis, realistic proportions, editorial luxury photography, hourglass framing, draped fabric",
    stylingGuidance:
      "wrap dresses, belted waists, soft draping, figure-flattering cuts, flowing fabrics, waist-defining silhouettes",
    framingGuidance:
      "waist-emphasizing composition, soft editorial lighting, graceful posture, feminine confidence, relaxed elegance",
  },
};

/**
 * Build the silhouette prompt modifier string for injection into generation prompts.
 * Returns empty string if no silhouette choice has been made.
 */
export function buildSilhouetteModifier(silhouette: SilhouetteChoice): string {
  if (!silhouette) return "";
  const tokens = SILHOUETTE_TOKENS[silhouette];
  return [tokens.promptModifier, tokens.stylingGuidance, tokens.framingGuidance].join(", ");
}
