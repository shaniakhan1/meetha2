import type { CreateOccasion, CreateEnergy, CreateRefinements } from "../shared/types";

// ─── Occasion scene environments ─────────────────────────────────────────────
const OCCASION_SCENE: Record<CreateOccasion, string> = {
  rooftop_dinner:
    "rooftop restaurant at night, city lights spread below, warm candlelight on a white linen table, champagne glasses catching the glow, ambient city hum, slightly elevated angle, the table is the foreground and the skyline is the world",
  private_reservation:
    "intimate fine dining interior, white tablecloth, single candle, crystal glasses, warm amber candlelight, other tables softly blurred in the background, the kind of restaurant that does not need to announce itself",
  airport_lounge:
    "premium airport lounge, floor-to-ceiling windows with tarmac and soft grey sky beyond, a leather seat, a ceramic coffee cup, carry-on bag with gold hardware, unhurried and expensive, no crowds",
  international_arrival:
    "international arrivals hall, warm overhead light, a structured leather bag on a polished floor, the energy of someone who just landed and still looks perfect, slight motion in the background, she is the still point",
  mediterranean_morning:
    "sun-bleached stone terrace overlooking the sea, a small round table with a ceramic coffee cup and a croissant, warm morning light, the water is a deep Mediterranean blue in the distance, no agenda",
  hotel_balcony:
    "hotel balcony at golden hour, white linen curtains moving in a warm breeze, a glass of wine on the railing, terracotta rooftops or treetops below, the light is amber and unhurried",
  beach_club_arrival:
    "luxury beach club, white sun loungers, parasols casting soft shadows, the sea a brilliant turquoise in the background, warm midday light, the energy of arrival not departure",
  coffee_meeting:
    "quiet corner of a minimal café, marble table, a ceramic flat white, a leather notebook open, warm window light, the kind of meeting that happens before the city fully wakes up",
  birthday_dinner:
    "celebratory dinner table, candles, flowers, champagne in a silver bucket, warm amber light, the table is full but the frame is intimate, the energy of a night that belongs to her",
  luxury_casual:
    "a quiet residential street or courtyard, warm afternoon light on stone or brick, a structured bag, sunglasses, the energy of someone who dressed this way for no particular reason",
  nyc_winter:
    "New York City sidewalk in winter, grey sky, warm breath visible in cold air, yellow taxi blur in the background, a long coat, the energy of someone moving through the city with purpose",
  pilates_morning:
    "early morning studio or quiet residential street, soft pre-dawn light, a coffee cup in hand, the energy of someone who was already up before the city, unhurried and deliberate",
};

// ─── Energy visual filters ────────────────────────────────────────────────────
const ENERGY_VISUAL: Record<CreateEnergy, string> = {
  quiet_luxury:
    "extreme negative space, cream and warm ivory tones, one deliberate element, architectural stillness, nothing unnecessary in the frame, the restraint is the statement",
  soft_power:
    "warm diffused amber light, soft intimate framing, emotional depth without sentimentality, the feeling of being seen by someone who understands",
  editorial:
    "strong compositional framing, the image tells a story without explaining it, off-center subject, environmental depth, the moment is observed not performed",
  magnetic:
    "strong visual pull, confident framing, rich warm saturation, the subject commands the frame without aggression, everything else adjusts",
  old_money:
    "inherited ease, warm patina tones, aged leather and heavy linen, the confidence of someone who has never needed to announce anything",
  minimalist:
    "one element done perfectly, clean negative space, precise shadow, nothing competes, the simplicity is the luxury",
  cinematic:
    "every frame could be a film still, shallow depth of field, motivated lighting, the scene has a before and after even if we only see the middle",
  femme_fatale:
    "low warm light, deliberate shadow, the frame is controlled, nothing accidental, the energy is unhurried and certain",
  rich_grandma:
    "silk, pearls, warm afternoon light, the confidence of someone who has already seen everything and found it slightly amusing, absolutely unbothered",
};

// ─── Refinement token maps ────────────────────────────────────────────────────
const REFINEMENT_TOKENS: Record<string, Record<string, string>> = {
  warmCool: {
    warm: "warm amber and honey tones, golden hour color temperature",
    cool: "cool silver and blue-grey tones, overcast or shade light",
  },
  metalTone: {
    gold: "gold jewelry detail, warm brass and amber metal accents",
    silver: "silver jewelry detail, cool platinum and chrome accents",
  },
  motionStyle: {
    motion: "slight motion blur, mid-movement, the subject is in transit, candid energy",
    static: "perfectly still composition, no motion, the stillness is intentional",
  },
  shootStyle: {
    candid: "candid documentary framing, the subject does not know they are being photographed, accidentally beautiful",
    editorial: "editorial framing, the composition is deliberate, every element is placed with intention",
  },
  makeupLevel: {
    glam: "full glam makeup implied, bold lip, strong brow, the face is the statement",
    natural: "no-makeup makeup implied, skin-first, effortless, the beauty is in the naturalness",
  },
};

/**
 * Build a cinematic prompt for the Create Studio flow.
 * Occasion sets the environment. Energy sets the visual filter.
 * Refinements toggle specific tokens. Archetype/mood add identity layer.
 */
export function buildCreateStudioPrompt(
  occasion: CreateOccasion,
  energy: CreateEnergy,
  refinements: CreateRefinements,
  archetype: string,
  mood: string,
  aestheticDescriptors: string | null | undefined,
  bodyType: string | null | undefined,
  physicalDescriptors: string | null | undefined
): string {
  const scene = OCCASION_SCENE[occasion];
  const energyLayer = ENERGY_VISUAL[energy];

  // Build refinement tokens
  const refinementParts: string[] = [];
  if (refinements.warmCool) refinementParts.push(REFINEMENT_TOKENS.warmCool[refinements.warmCool]);
  if (refinements.metalTone) refinementParts.push(REFINEMENT_TOKENS.metalTone[refinements.metalTone]);
  if (refinements.motionStyle) refinementParts.push(REFINEMENT_TOKENS.motionStyle[refinements.motionStyle]);
  if (refinements.shootStyle) refinementParts.push(REFINEMENT_TOKENS.shootStyle[refinements.shootStyle]);
  if (refinements.makeupLevel) refinementParts.push(REFINEMENT_TOKENS.makeupLevel[refinements.makeupLevel]);
  const refinementLayer = refinementParts.length > 0 ? refinementParts.join(", ") + "," : "";

  const aestheticLayer = aestheticDescriptors
    ? `calibrated to this specific aesthetic: ${aestheticDescriptors},`
    : "";
  const bodyLayer = bodyType ? `maintain natural ${bodyType} proportions,` : "";
  const physicalLayer = physicalDescriptors
    ? `preserve subject's natural complexion and undertones, maintain authentic facial structure, ${physicalDescriptors},`
    : "";

  return `${scene}, ${energyLayer}, ${refinementLayer} ${aestheticLayer} ${bodyLayer} ${physicalLayer} editorial female-gaze aesthetic, focus on wardrobe styling, fabric texture, jewelry detail, and atmospheric lighting, cinematic lighting, subtle film grain, analog texture, imperfect focus, mood over sharpness, no beauty retouching, realistic textures, atmospheric depth, no faces, no full bodies, hands only when naturally holding an object, vertical 9:16 framing, photorealistic`;
}
