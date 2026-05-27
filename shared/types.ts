export type Archetype =
  | "luxury_minimal"
  | "elegant_chaos"
  | "soft_power"
  | "dark_feminine"
  | "ethereal";

export type Mood = "soft" | "magnetic" | "grounded" | "untamed";

export type Platform = "tiktok" | "reels" | "stories";

export type SceneCategory =
  | "morning_routine"
  | "travel_day"
  | "quiet_luxury"
  | "founder_energy"
  | "date_night"
  | "paparazzi_flash"
  | "digital_diary"
  | "bill_please"
  | "silk_robe_room_service"
  | "irish_goodbye"
  | "cleopatra_principle"
  | "silk_robe_retaliation"
  | "motion_blur";

export type PostabilityResponse = "yes" | "maybe" | "no";

export type VideoFormat = "tiktok_reels" | "square" | "landscape";

export const VIDEO_FORMAT_LABELS: Record<VideoFormat, string> = {
  tiktok_reels: "TikTok / Reels",
  square: "Square",
  landscape: "Landscape",
};

export const VIDEO_FORMAT_DESCRIPTIONS: Record<VideoFormat, string> = {
  tiktok_reels: "9:16 vertical - TikTok, Instagram Reels, YouTube Shorts",
  square: "1:1 - Instagram feed, Facebook",
  landscape: "16:9 horizontal - YouTube, Facebook cover",
};

// Maps video format to Fal/image aspect ratio string
export const VIDEO_FORMAT_ASPECT: Record<VideoFormat, string> = {
  tiktok_reels: "portrait_16_9",  // 9:16 vertical
  square: "square_hd",
  landscape: "landscape_16_9",
};

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  luxury_minimal: "Quiet Luxury",
  elegant_chaos: "Warm Editorial",
  soft_power: "Magnetic Minimalist",
  dark_feminine: "Sculpted Glamour",
  ethereal: "Soft Contrast",
};

export const ARCHETYPE_DESCRIPTIONS: Record<Archetype, string> = {
  luxury_minimal:
    "Extreme negative space. Cream, ivory, and warm stone. One deliberate piece. Nothing unnecessary.",
  elegant_chaos:
    "Rich texture, layered warmth. Amber, cognac, and deep camel. Structured silhouettes with one undone element.",
  soft_power:
    "Clean lines, warm neutrals. Cashmere and linen. Understated jewelry. The look that does not try.",
  dark_feminine:
    "Deep jewel tones and warm blacks. Velvet, leather, and heavy silk. Bold lip, strong brow, minimal eye.",
  ethereal:
    "Soft whites, blush, and warm ivory. Lightweight fabrics. Diffused light. Delicate metals and minimal contrast.",
};

export const MOOD_LABELS: Record<Mood, string> = {
  soft: "Intimate and Warm",
  magnetic: "Sharp and Polished",
  grounded: "Grounded and Certain",
  untamed: "Alive and Uncontained",
};

export const MOOD_DESCRIPTIONS: Record<Mood, string> = {
  soft: "Soft light, close framing, warm tones. Styling is intimate and layered. The camera moves slowly.",
  magnetic: "High contrast, precise styling, clean lines. Every element is deliberate. Nothing is accidental.",
  grounded: "Natural light, relaxed silhouettes, warm textures. Unhurried. The confidence of someone who has already decided.",
  untamed: "Movement, texture, and energy. Styling is bold and layered. The frame cannot fully contain it.",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: "Feed Post",
  reels: "Portrait",
  stories: "Stories",
};

// Human-readable format descriptions shown in UI
export const PLATFORM_DESCRIPTIONS: Record<Platform, string> = {
  tiktok: "Square or landscape",
  reels: "4:5 portrait",
  stories: "9:16 full screen",
};

// ─── Create Studio Types ────────────────────────────────────────────────────
export type CreateOccasion =
  | "rooftop_dinner"
  | "private_reservation"
  | "airport_lounge"
  | "international_arrival"
  | "mediterranean_morning"
  | "hotel_balcony"
  | "beach_club_arrival"
  | "coffee_meeting"
  | "birthday_dinner"
  | "luxury_casual"
  | "nyc_winter"
  | "pilates_morning";

export type CreateEnergy =
  | "quiet_luxury"
  | "soft_power"
  | "editorial"
  | "magnetic"
  | "old_money"
  | "minimalist"
  | "cinematic"
  | "femme_fatale"
  | "rich_grandma";

export interface CreateRefinements {
  warmCool: "warm" | "cool" | null;
  metalTone: "gold" | "silver" | null;
  motionStyle: "motion" | "static" | null;
  shootStyle: "candid" | "editorial" | null;
  makeupLevel: "glam" | "natural" | null;
}

export const CREATE_OCCASION_LABELS: Record<CreateOccasion, string> = {
  rooftop_dinner: "Rooftop Dinner",
  private_reservation: "Private Reservation",
  airport_lounge: "Airport Lounge",
  international_arrival: "International Arrival",
  mediterranean_morning: "Mediterranean Morning",
  hotel_balcony: "Hotel Balcony",
  beach_club_arrival: "Beach Club Arrival",
  coffee_meeting: "Coffee Meeting",
  birthday_dinner: "Birthday Dinner",
  luxury_casual: "Luxury Casual",
  nyc_winter: "NYC Winter",
  pilates_morning: "Pilates Morning",
};

export const CREATE_OCCASION_DESCRIPTIONS: Record<CreateOccasion, string> = {
  rooftop_dinner: "City lights. Warm evening air.",
  private_reservation: "The table was already set for her.",
  airport_lounge: "Off-duty. Quietly expensive.",
  international_arrival: "She just landed. Still perfect.",
  mediterranean_morning: "Slow light. Warm stone. No plans.",
  hotel_balcony: "Private view. Unhurried morning.",
  beach_club_arrival: "She walked in and the energy shifted.",
  coffee_meeting: "Sharp. Present. Dressed with intention.",
  birthday_dinner: "Her night. No explanation needed.",
  luxury_casual: "Effortless. Expensive. Off-duty.",
  nyc_winter: "Coat season. City energy. Moving.",
  pilates_morning: "Before the city woke up.",
};

export const CREATE_ENERGY_LABELS: Record<CreateEnergy, string> = {
  quiet_luxury: "Quiet Luxury",
  soft_power: "Soft Power",
  editorial: "Editorial",
  magnetic: "Magnetic",
  old_money: "Old Money",
  minimalist: "Minimalist",
  cinematic: "Cinematic",
  femme_fatale: "Femme Fatale",
  rich_grandma: "Rich Grandma",
};

export const CREATE_ENERGY_DESCRIPTIONS: Record<CreateEnergy, string> = {
  quiet_luxury: "Understated. Precise. Nothing unnecessary.",
  soft_power: "Warm authority. Knows without announcing.",
  editorial: "Framing over beauty. The image tells a story.",
  magnetic: "She pulls focus without trying.",
  old_money: "Inherited ease. Unhurried confidence.",
  minimalist: "One thing. Done perfectly.",
  cinematic: "Every frame could be a still.",
  femme_fatale: "Deliberate. Low. Unhurried.",
  rich_grandma: "Silk. Pearls. Absolutely unbothered.",
};

export const SCENE_LABELS: Record<SceneCategory, string> = {
  morning_routine: "Morning Ritual",
  travel_day: "In Motion",
  quiet_luxury: "Quiet Wealth",
  founder_energy: "The Work",
  date_night: "Evening Energy",
  paparazzi_flash: "Caught Looking Expensive",
  digital_diary: "Digital Diary",
  bill_please: "Bill, Please",
  silk_robe_room_service: "Room Service",
  irish_goodbye: "The Goodbye",
  cleopatra_principle: "The Cleopatra Principle",
  silk_robe_retaliation: "The Robe Reset",
  motion_blur: "The Blur",
};

// ─── Plan Limits ─────────────────────────────────────────────────────────────

/**
 * Canonical credit limits per plan tier.
 * generationNumber (from backend) decides what output mode to show.
 * creditsRemaining decides whether the user can keep generating.
 */
export const PLAN_GENERATION_LIMITS = {
  free: 1,
  starter: 25,
  pro: 25,
} as const;

export type PlanTier = keyof typeof PLAN_GENERATION_LIMITS;
