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
  | "date_night";

export type PostabilityResponse = "yes" | "maybe" | "no";

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  luxury_minimal: "Luxury Minimal",
  elegant_chaos: "Elegant Chaos",
  soft_power: "Soft Power",
  dark_feminine: "Dark Feminine",
  ethereal: "Ethereal",
};

export const ARCHETYPE_DESCRIPTIONS: Record<Archetype, string> = {
  luxury_minimal:
    "Less is everything. Clean lines. Intentional silence. The most expensive thing in the room.",
  elegant_chaos:
    "Beautiful contradiction. Bold and soft simultaneously. Impossible to ignore.",
  soft_power:
    "This aesthetic creates emotional magnetism without needing loudness. People lean in.",
  dark_feminine:
    "Depth, mystery, and quiet power. You do not need to be seen to be felt.",
  ethereal:
    "Otherworldly softness. Light through silk. The feeling of something sacred and untouchable.",
};

export const MOOD_LABELS: Record<Mood, string> = {
  soft: "Soft",
  magnetic: "Magnetic",
  grounded: "Grounded",
  untamed: "Untamed",
};

export const MOOD_DESCRIPTIONS: Record<Mood, string> = {
  soft: "Gentle, warm, and intimate. Content that feels like a quiet morning.",
  magnetic: "Pulls people in without effort. Irresistible and effortlessly captivating.",
  grounded: "Rooted, calm, and deeply confident. Presence without performance.",
  untamed: "Wild elegance. Unapologetic and free. Beauty that refuses to be contained.",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: "TikTok",
  reels: "Reels",
  stories: "Stories",
};

export const SCENE_LABELS: Record<SceneCategory, string> = {
  morning_routine: "Morning Routine",
  travel_day: "Travel Day",
  quiet_luxury: "Quiet Luxury",
  founder_energy: "Founder Energy",
  date_night: "Date Night",
};
