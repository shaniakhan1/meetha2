// Quick script to build and display the curvy silhouette generation prompt
// Run: node scripts/test-curvy-prompt.mjs

const SILHOUETTE_TOKENS = {
  slim: {
    label: "Slim",
    description: "Elongated, fashion-forward cuts with clean lines",
    promptModifier: "lean editorial silhouette, elongated proportions, fashion-forward styling, streamlined cuts, vertical lines, column silhouette",
    stylingGuidance: "sleek tailoring, straight-leg trousers, column dresses, minimal volume, clean structured cuts, monochromatic layering",
    framingGuidance: "full-length editorial framing, vertical composition, long lines emphasized, confident upright posture",
  },
  athletic: {
    label: "Athletic",
    description: "Strong, structured tailoring with confident proportions",
    promptModifier: "athletic strong silhouette, structured tailoring, confident proportions, powerful presence, defined shoulders, bold cuts",
    stylingGuidance: "structured blazers, wide-leg trousers, strong shoulders, tailored fits, bold geometric cuts, power dressing",
    framingGuidance: "confident stance, strong posture, dynamic framing, power pose, shoulders back, grounded presence",
  },
  curvy: {
    label: "Curvy",
    description: "Elegant silhouette with soft waist emphasis and luxury proportions",
    promptModifier: "curvy elegant silhouette, soft waist emphasis, realistic proportions, editorial luxury photography, hourglass framing, draped fabric",
    stylingGuidance: "wrap dresses, belted waists, soft draping, figure-flattering cuts, flowing fabrics, waist-defining silhouettes",
    framingGuidance: "waist-emphasizing composition, soft editorial lighting, graceful posture, feminine confidence, relaxed elegance",
  },
};

function buildSilhouetteModifier(silhouette) {
  if (!silhouette) return "";
  const tokens = SILHOUETTE_TOKENS[silhouette];
  return [tokens.promptModifier, tokens.stylingGuidance, tokens.framingGuidance].join(", ");
}

function buildBodyPreservationModifier(silhouette, physicalDescriptors) {
  const validSilhouette = ["slim", "athletic", "curvy"].includes(silhouette) ? silhouette : null;
  const silhouetteModifier = buildSilhouetteModifier(validSilhouette);
  const physicalAnchor = physicalDescriptors
    ? "preserve subject's natural complexion and undertones, maintain authentic facial structure,"
    : "";

  if (silhouetteModifier) {
    return `STYLING DIRECTION: ${silhouetteModifier}. IDENTITY PRESERVATION: ${physicalAnchor} preserve her natural body proportions and physical presence. Do not slim, elongate, or alter her natural body composition.`;
  }
  return `IDENTITY PRESERVATION: ${physicalAnchor} preserve her natural body proportions and physical presence. Do not slim, elongate, or alter her natural body composition.`;
}

// Simulate a curvy user with soft_power archetype, magnetic mood, quiet_luxury scene
const archetype = "soft_power";
const mood = "magnetic";
const scene = "close-up of hands with warm deep brown skin wrapped around a ceramic cup, steam rising, soft amber morning light through sheer linen curtains, gold ring detail, intimate scale";
const archetypeStyle = "warm diffused amber light, soft intimate framing, emotional depth without sentimentality, the feeling of being seen";
const moodStyle = "strong visual pull, confident centered framing, rich warm saturation, commanding without aggression";

const bodyPreservation = buildBodyPreservationModifier("curvy", "warm brown skin, dark eyes, full lips");
const physicalAnchor = "preserve subject's natural complexion and undertones, maintain authentic facial structure, warm brown skin, dark eyes, full lips,";

const fullPrompt = `${bodyPreservation} ${scene}, ${archetypeStyle}, ${moodStyle}, warm honey skin tones where hands are visible, gold jewelry details, editorial female-gaze aesthetic, focus on wardrobe styling, fabric texture, jewelry detail, and atmospheric lighting, cinematic lighting, subtle film grain, realistic textures, warm amber tones, atmospheric depth, no faces, no full bodies, hands only when naturally holding an object, vertical 9:16 framing, social-media-ready, photorealistic, high resolution`;

console.log("=== CURVY SILHOUETTE TOKENS ===");
console.log(JSON.stringify(SILHOUETTE_TOKENS.curvy, null, 2));
console.log("\n=== SILHOUETTE MODIFIER ===");
console.log(buildSilhouetteModifier("curvy"));
console.log("\n=== BODY PRESERVATION BLOCK ===");
console.log(bodyPreservation);
console.log("\n=== FULL GENERATION PROMPT ===");
console.log(fullPrompt);
console.log("\nPrompt length:", fullPrompt.length, "chars");
