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
  luxury_minimal: "Still Frequency",
  elegant_chaos: "Electric Frequency",
  soft_power: "Magnetic Frequency",
  dark_feminine: "Deep Frequency",
  ethereal: "Light Frequency",
};

export const ARCHETYPE_DESCRIPTIONS: Record<Archetype, string> = {
  luxury_minimal:
    "Stillness as power. Negative space that speaks. The room goes quiet when this energy enters.",
  elegant_chaos:
    "High voltage, soft landing. Contradictions that make sense only when you feel them.",
  soft_power:
    "Warmth with edges. People lean in without knowing why. Presence that does not announce itself.",
  dark_feminine:
    "Depth that cannot be measured. Unhurried, unshaken. Felt before it is seen.",
  ethereal:
    "Translucent and luminous. The frequency of something sacred. Light moving through silk.",
};

export const MOOD_LABELS: Record<Mood, string> = {
  soft: "Low and Warm",
  magnetic: "High and Clear",
  grounded: "Rooted and Steady",
  untamed: "Open and Moving",
};

export const MOOD_DESCRIPTIONS: Record<Mood, string> = {
  soft: "Slow, intimate, and deeply present. The frequency of a quiet morning that belongs only to you.",
  magnetic: "Effortlessly drawing. Clear signal, no static. Everything in the frame feels chosen.",
  grounded: "Unhurried and certain. The confidence of someone who has already decided.",
  untamed: "Uncontained and alive. Beauty that refuses to be organized. Wildness with taste.",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: "TikTok",
  reels: "Reels",
  stories: "Stories",
};

export const SCENE_LABELS: Record<SceneCategory, string> = {
  morning_routine: "Morning Ritual",
  travel_day: "In Motion",
  quiet_luxury: "Quiet Wealth",
  founder_energy: "The Work",
  date_night: "Evening Energy",
};
